"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Activity,CheckCircle2,Download,Dumbbell,Info,Pause,Play,RefreshCcw,ShieldCheck,Target,Timer,Video,VideoOff,Zap,SwitchCamera,ScanLine} from "lucide-react";
import {CONNECTIONS,EXERCISES,newMotionState,processMotion,type ExerciseId,type Landmark,type MotionState} from "@/lib/fitness-engine";
import {api} from "@/lib/client-api";
import styles from "./fitness.module.css";

type Model={detectForVideo(video:HTMLVideoElement,time:number):{landmarks:Landmark[][]};close():void};
type Vision={
 FilesetResolver:{forVisionTasks(path:string):Promise<unknown>};
 PoseLandmarker:{createFromOptions(files:unknown,options:Record<string,unknown>):Promise<Model>};
};
declare global {interface Window {vision?:Vision}}
type Workout={id:string;exercise:ExerciseId;reps:number;seconds:number;at:string;points:number};
const VERSION="0.10.32";
const MODEL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
let visionPromise:Promise<Vision>|null=null;
function loadVision():Promise<Vision>{
 if(typeof window==="undefined")return Promise.reject(new Error("Camera chỉ hoạt động trong trình duyệt."));
 if(!visionPromise){
  const address="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@"+VERSION+"/vision_bundle.mjs";
  visionPromise=import(/* webpackIgnore: true */ address).then((module:Vision)=>{
   if(!module.FilesetResolver||!module.PoseLandmarker)throw new Error("Mô hình không có các API MediaPipe cần thiết.");
   return module;
  }).catch((error:unknown)=>{visionPromise=null;throw error;});
 }
 return visionPromise;
}
function paint(canvas:HTMLCanvasElement,landmarks:Landmark[]){
 const ctx=canvas.getContext("2d");if(!ctx)return;
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const good=(i:number)=>{const p=landmarks[i];return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.5};
 const points=landmarks.map((p,i)=>good(i)?p:null).filter((p):p is Landmark=>Boolean(p));
 if(points.length<5)return;
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
 const scale=Math.min(w*.78/Math.max(.38,maxX-minX),h*.84/Math.max(.65,maxY-minY));
 const xy=(i:number)=>({x:w/2+(landmarks[i].x-centerX)*scale,y:h/2+(landmarks[i].y-centerY)*scale});
 ctx.lineJoin="round";ctx.lineCap="round";ctx.lineWidth=Math.max(3,w/120);
 ctx.shadowBlur=w/52;ctx.shadowColor="#f3b07088";
 ctx.strokeStyle="#f6c997";
 for(const [a,b] of CONNECTIONS){if(!good(a)||!good(b))continue;const p=xy(a),q=xy(b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
 ctx.shadowBlur=0;
 for(let i=0;i<landmarks.length;i++){if(!good(i))continue;const p=xy(i);ctx.beginPath();ctx.fillStyle=i===11||i===12||i===23||i===24?"#ffdf9b":"#ffa766";ctx.strokeStyle="#fff5dd";ctx.lineWidth=Math.max(1.5,w/290);ctx.arc(p.x,p.y,Math.max(3,w/125),0,Math.PI*2);ctx.fill();ctx.stroke();}
}
const duration=(s:number)=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const storageKey=(account:string)=>"smartnotes-fitness-v1:"+account;
export function FitnessView({accountId,onSessionSaved}:{accountId:string;onSessionSaved?:(workout:{id:string;exercise:ExerciseId;reps:number;seconds:number},awarded:number)=>Promise<unknown>|void}){
 const [exerciseId,setExerciseId]=useState<ExerciseId>("squat");
 const [goal,setGoal]=useState(12);
 const [running,setRunning]=useState(false);
 const [loading,setLoading]=useState(false);
 const [paused,setPaused]=useState(false);
 const [reps,setReps]=useState(0);
 const [seconds,setSeconds]=useState(0);
 const [history,setHistory]=useState<Workout[]>([]);
 const [cloudError,setCloudError]=useState("");
 const [rewardFeedback,setRewardFeedback]=useState("");
 const cloud=accountId!=="demo"&&accountId!=="guest";
 const [feedback,setFeedback]=useState("Chọn bài tập, đặt thiết bị cố định và bấm Bật camera.");
 const [metric,setMetric]=useState("—");
 const [error,setError]=useState("");
 const [ratio,setRatio]=useState("4 / 3");
 const [fps,setFps]=useState(0);
 const [mirror,setMirror]=useState(true);
 const [cameraFacing,setCameraFacing]=useState<"user"|"environment">("user");
 const [switching,setSwitching]=useState(false);
 const facingRef=useRef<"user"|"environment">("user");
 const switchingRef=useRef(false);
 const video=useRef<HTMLVideoElement|null>(null);
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const model=useRef<Model|null>(null);
 const raf=useRef(0);
 const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 const motion=useRef<MotionState>(newMotionState());
 const active=useRef(false);
 const isPaused=useRef(false);
 const isLoading=useRef(false);
 const sessionToken=useRef(0);
 const elapsed=useRef(0);
 const counted=useRef(0);
 const exerciseRef=useRef<ExerciseId>("squat");
 const lastStatus=useRef("");
 const lastFrame=useRef(0);
 const firstFrame=useRef(0);
 const [storageReady,setStorageReady]=useState(false);
 const exercise=EXERCISES.find(e=>e.id===exerciseId)||EXERCISES[0];

 useEffect(()=>{
  try{const raw=localStorage.getItem(storageKey(accountId));if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setHistory(parsed.filter((s:Workout)=>s&&EXERCISES.some(x=>x.id===s.exercise)&&Number.isFinite(s.reps)).slice(0,100));}}
  catch{/* no browser storage */}
  setStorageReady(true);
  if(cloud){
   let disposed=false;
   api<{sessions:Workout[]}>("/fitness").then(result=>{
    if(disposed)return;
    setHistory(previous=>{
     const map=new Map<string,Workout>();
     for(const row of [...result.sessions,...previous])map.set(row.id,row);
     const merged=[...map.values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100);
     try{localStorage.setItem(storageKey(accountId),JSON.stringify(merged));}catch{/* browser disabled storage */}
     return merged;
    });
    setCloudError("");
   }).catch(()=>{if(!disposed)setCloudError("Không kết nối được lịch sử trên máy chủ. Dữ liệu trên thiết bị vẫn còn.");});
   return ()=>{disposed=true;};
  }
 },[accountId,cloud]);
 const saveHistory=useCallback((entry:Workout)=>{
  setHistory(previous=>{
   const next=[entry,...previous].slice(0,100);
   try{localStorage.setItem(storageKey(accountId),JSON.stringify(next));}catch{/* storage disabled */}
   return next;
  });
  if(cloud){
   void api<{session:Workout;awarded:number}>("/fitness",{method:"POST",body:JSON.stringify({id:entry.id,exercise:entry.exercise,reps:entry.reps,seconds:entry.seconds})})
    .then(result=>{setCloudError("");setRewardFeedback(result.awarded>0?"+4 Điểm Nắng! Em đã hoàn thành một hoạt động nhẹ.":"Đã lưu buổi tập. Hãy nghỉ ngơi khi cần.");return onSessionSaved?.(entry,result.awarded);})
    .catch(()=>setCloudError("Chưa đồng bộ được buổi tập vừa lưu. Dữ liệu vẫn nằm trên thiết bị này."));
  }else{
   void Promise.resolve(onSessionSaved?.(entry,0)).then(v=>setRewardFeedback(v===4?"+4 Điểm Nắng!":"Đã lưu buổi tập trên thiết bị.")).catch(()=>setRewardFeedback("Đã lưu buổi tập trên thiết bị."));
  }
 },[accountId,cloud,onSessionSaved]);
 async function removeHistory(){
  if(!window.confirm("Xóa toàn bộ lịch sử tập thể dục của bạn? Thao tác này không thể hoàn tác."))return;
  try{
   if(cloud)await api("/fitness",{method:"DELETE"});
   setHistory([]);localStorage.removeItem(storageKey(accountId));setCloudError("");
  }catch{setCloudError("Không xóa được dữ liệu trên máy chủ. Hãy thử lại.");}
 }
 const clearCamera=useCallback(()=>{
  active.current=false;isPaused.current=false;isLoading.current=false;
  switchingRef.current=false;
  sessionToken.current++;
  cancelAnimationFrame(raf.current);
  if(timer.current){clearInterval(timer.current);timer.current=null;}
  if(video.current){video.current.pause();video.current.srcObject=null;}
  if(stream.current){for(const track of stream.current.getTracks())track.stop();stream.current=null;}
  if(model.current){try{model.current.close();}catch{/* already closed */}model.current=null;}
  const cv=canvas.current;cv?.getContext("2d")?.clearRect(0,0,cv.width,cv.height);
 },[]);
 useEffect(()=>()=>{clearCamera();},[clearCamera]);
 function stop(save:boolean){
  const completed=counted.current;
  const durationSeconds=elapsed.current;
  if(save&&completed>0){
   const ex=EXERCISES.find(item=>item.id===exerciseRef.current)||EXERCISES[0];
   saveHistory({id:crypto.randomUUID(),exercise:ex.id,reps:completed,seconds:durationSeconds,points:Math.round(completed*ex.points*10)/10,at:new Date().toISOString()});
  }
  clearCamera();setRunning(false);setLoading(false);setPaused(false);setFps(0);setSwitching(false);
  if(save)setFeedback(completed>0?"Đã lưu buổi tập trên thiết bị. Chúc mừng bạn!":"Buổi tập chưa có lần lặp hợp lệ.");
 }
 function changeExercise(id:ExerciseId){
  if(id===exerciseId)return;
  if(active.current||isLoading.current)stop(true);
  const ex=EXERCISES.find(item=>item.id===id)||EXERCISES[0];
  exerciseRef.current=id;setExerciseId(id);setGoal(ex.goal);
  motion.current=newMotionState();counted.current=0;elapsed.current=0;
  setReps(0);setSeconds(0);setError("");setMetric("—");setRewardFeedback("");setFeedback("Chuẩn bị tư thế cho bài "+ex.name+".");
 }
 function reset(){
  if(active.current||isLoading.current)stop(true);
  motion.current=newMotionState();counted.current=0;elapsed.current=0;
  setReps(0);setSeconds(0);setError("");setMetric("—");setFeedback("Sẵn sàng bắt đầu buổi tập mới.");
 }
 async function start(){
  if(active.current||isLoading.current)return;
  if(!navigator.mediaDevices?.getUserMedia){setError("Trình duyệt không hỗ trợ camera. Hãy dùng HTTPS trên Chrome hoặc Safari mới.");return;}
  isLoading.current=true;setLoading(true);setError("");setFeedback("Đang yêu cầu quyền camera…");
  const token=++sessionToken.current;
  let localStream:MediaStream|null=null;let localModel:Model|null=null;
  try{
   localStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facingRef.current},width:{ideal:480},height:{ideal:640},frameRate:{ideal:24,max:30}}});
   if(token!==sessionToken.current){localStream.getTracks().forEach(t=>t.stop());return;}
   stream.current=localStream;
   if(!video.current)throw new Error("Không tìm thấy khung camera.");
   video.current.srcObject=localStream;await video.current.play();
   if(token!==sessionToken.current){localStream.getTracks().forEach(t=>t.stop());return;}
   const frame=video.current;const width=frame.videoWidth||640,height=frame.videoHeight||480;
   setRatio(width+" / "+height);
   if(canvas.current){canvas.current.width=480;canvas.current.height=640;}
   setFeedback("Đang tải mô hình nhận diện tư thế…");
   const vision=await loadVision();
   const files=await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@"+VERSION+"/wasm");
   const opts=(delegate:"GPU"|"CPU")=>({baseOptions:{modelAssetPath:MODEL,delegate},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5});
   try{localModel=await vision.PoseLandmarker.createFromOptions(files,opts("GPU"));}
   catch{localModel=await vision.PoseLandmarker.createFromOptions(files,opts("CPU"));}
   if(token!==sessionToken.current){localModel.close();return;}
   model.current=localModel;active.current=true;isLoading.current=false;setLoading(false);setRunning(true);
   setFeedback("AI đã sẵn sàng. Để cơ thể nằm trọn khung hình.");
   firstFrame.current=performance.now();lastFrame.current=0;lastStatus.current="";
   timer.current=setInterval(()=>{if(active.current&&!isPaused.current){elapsed.current++;setSeconds(elapsed.current);}},1000);
   const loop=(now:number)=>{
    if(!active.current||token!==sessionToken.current)return;
    raf.current=requestAnimationFrame(loop);
    if(isPaused.current||!video.current||video.current.readyState<2||now-lastFrame.current<90)return;
    const frameDelta=lastFrame.current>0?now-lastFrame.current:0;
    lastFrame.current=now;
    if(frameDelta>0&&now-firstFrame.current>500){setFps(Math.round(1000/frameDelta));firstFrame.current=now;}
    try{
     const output=model.current?.detectForVideo(video.current,now);
     const points=output?.landmarks?.[0];
     const cv=canvas.current;
     if(cv){const ctx=cv.getContext("2d");if(points?.length)paint(cv,points);else ctx?.clearRect(0,0,cv.width,cv.height);}
     if(points?.length){
      const result=processMotion(exerciseRef.current,points,motion.current,now);
      motion.current=result.state;
      if(result.accepted){counted.current=result.state.count;setReps(result.state.count);}
      const key=result.message+"|"+result.metric;
      if(key!==lastStatus.current){lastStatus.current=key;setFeedback(result.message);setMetric(result.metric);}
     }else if(lastStatus.current!=="not-found"){lastStatus.current="not-found";setFeedback("Không thấy người trong camera. Lùi lại để AI nhận diện.");setMetric("—");}

    }catch(e){setFeedback(e instanceof Error?"Đang kiểm tra lại khung hình: "+e.message:"Không xử lý được hình ảnh.");}
   };
   raf.current=requestAnimationFrame(loop);
  }catch(e){
   if(token===sessionToken.current){
    clearCamera();setRunning(false);setLoading(false);
    const message=e instanceof Error?e.message:"Không khởi động được camera.";
    setError(message.includes("NotAllowed")?"Bạn chưa cấp quyền camera. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.":message);
    setFeedback("Camera chưa khởi động. Kiểm tra quyền truy cập hoặc kết nối mạng.");
   }else{localModel?.close();localStream?.getTracks().forEach(t=>t.stop());}
  }
 }
 async function switchLens(){
  if(isLoading.current||switchingRef.current)return;
  const before=facingRef.current;
  const next=before==="user"?"environment":"user";
  if(!active.current){
   facingRef.current=next;setCameraFacing(next);setMirror(next==="user");
   setFeedback(next==="user"?"Đã chọn camera trước.":"Đã chọn camera sau.");
   return;
  }
  const token=sessionToken.current;switchingRef.current=true;setSwitching(true);setError("");
  setFeedback("Đang chuyển sang camera "+(next==="user"?"trước":"sau")+"…");
  const player=video.current;
  if(!player){switchingRef.current=false;setSwitching(false);return;}
  try{
   // Releasing the previous track is essential on iOS, where only one lens can stay open.
   stream.current?.getTracks().forEach(track=>track.stop());
   stream.current=null;player.pause();player.srcObject=null;
   const newStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:next},width:{ideal:480},height:{ideal:640},frameRate:{ideal:24,max:30}}});
   if(token!==sessionToken.current||!active.current){newStream.getTracks().forEach(t=>t.stop());return;}
   stream.current=newStream;player.srcObject=newStream;
   await player.play();
   if(token!==sessionToken.current||!active.current){newStream.getTracks().forEach(t=>t.stop());return;}
   facingRef.current=next;setCameraFacing(next);setMirror(next==="user");
   const w=player.videoWidth||480,h=player.videoHeight||640;setRatio(w+" / "+h);
   if(canvas.current){canvas.current.width=480;canvas.current.height=640;canvas.current.getContext("2d")?.clearRect(0,0,480,640);}
   motion.current.stableAt=0;lastFrame.current=0;
   setFeedback("Camera "+(next==="user"?"trước":"sau")+" đã sẵn sàng · giữ cơ thể trong khung hình.");
  }catch(e){
   // A laptop or browser may have only one physical camera. Restore the old one.
   if(token!==sessionToken.current||!active.current)return;
   try{
    const oldStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:before},width:{ideal:480},height:{ideal:640}}});
    if(token!==sessionToken.current||!active.current){oldStream.getTracks().forEach(t=>t.stop());return;}
    stream.current=oldStream;player.srcObject=oldStream;await player.play();
    lastFrame.current=0;
    setError("Không tìm thấy camera "+(next==="environment"?"sau":"trước")+" trên thiết bị. Đã khôi phục camera cũ.");
   }catch{
    setError("Không thể mở lại camera. Hãy bấm Bật camera để thử lại.");
    stop(true);
   }
  }finally{switchingRef.current=false;setSwitching(false);}
 }
 function pauseToggle(){if(!active.current)return;isPaused.current=!isPaused.current;setPaused(isPaused.current);setFeedback(isPaused.current?"Đã tạm dừng đếm và thời gian.":"Đã tiếp tục đếm động tác.");}
 function downloadCsv(){
  const columns=["time","exercise","reps","duration_seconds","points"];
  const rows=history.map(h=>[h.at,h.exercise,h.reps,h.seconds,h.points]);
  const csv=[columns,...rows].map(row=>row.join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="smartnotes-fitness-history.csv";link.click();URL.revokeObjectURL(url);
 }
 const totalReps=history.reduce((sum,h)=>sum+h.reps,0);
 const totalMinutes=Math.floor(history.reduce((sum,h)=>sum+h.seconds,0)/60);
 const totalPoints=Math.round(history.reduce((sum,h)=>sum+h.points,0));
 const today=new Date().toLocaleDateString("en-CA");
 const todayCount=history.filter(h=>new Date(h.at).toLocaleDateString("en-CA")===today).length;
 return <div className={styles.root}>
  <section className={styles.hero}>
   <div><span className={styles.kicker}>THỂ CHẤT & CÔNG NGHỆ AI</span><h1>FitMotion · Tập khỏe cùng AI</h1><p>Camera nhận diện 33 điểm khớp, vẽ bộ khung chuyển động và đếm từng lần hoàn thành. Tất cả hình ảnh được xử lý ngay trên thiết bị.</p></div>
   <div className={styles.heroMark}><Dumbbell size={34}/></div>
  </section>
  <div className={styles.stats}>
   <div className={styles.stat}><strong>{history.length}</strong><span>Buổi tập đã lưu</span></div>
   <div className={styles.stat}><strong>{totalReps}</strong><span>Động tác hợp lệ</span></div>
   <div className={styles.stat}><strong>{totalMinutes}</strong><span>Phút vận động</span></div>
   <div className={styles.stat}><strong>{totalPoints}</strong><span>Điểm vận động</span></div>
  </div>
      <section className={styles.panel+" "+styles.exercisePicker}><div className={styles.panelPad}>
     <div className={styles.sectionHead}><div><h2>Chọn bài tập</h2><p>7 động tác · tự đếm bằng chuyển động khớp</p></div><span className={styles.chip}><Zap size={13}/> + điểm</span></div>
     <div className={styles.exerciseGrid}>{EXERCISES.map(ex=><button key={ex.id} className={styles.exercise} aria-pressed={exerciseId===ex.id} onClick={()=>changeExercise(ex.id)}><span className={styles.exerciseSymbol}><Dumbbell size={17}/></span><span><b>{ex.name}</b><small>{ex.short}</small></span></button>)}</div>
     <p className={styles.note}><b>Điểm Nắng:</b> buổi tập từ 30 giây và ít nhất 4 lần hợp lệ được +4 điểm. Tối đa 2 bài khác nhau/ngày (8 điểm), không thưởng thêm khi tập quá nhiều. <ShieldCheck size={14} style={{verticalAlign:"middle",marginRight:4}}/> Số lần là ước lượng dựa trên pose + bộ quy tắc hình học. Không phải đánh giá y khoa hay huấn luyện viên chuyên nghiệp. Hãy dừng nếu cảm thấy đau.</p>
    </div></section>

  <div className={styles.layout}>
   <section className={styles.panel}>
    <div className={styles.panelPad}>
     <div className={styles.sectionHead}><div><h2><Video size={17} style={{verticalAlign:"middle",marginRight:7}}/> Camera & chuyển động AI</h2><p>Camera và bộ khung hiển thị độc lập, không chồng hình lên nhau</p></div><span className={styles.chip}><Activity size={13}/> MediaPipe</span></div>
     <div className={styles.visionStage}>
      <section className={styles.visionTile} aria-label="Camera thật">
       <div className={styles.visionTileHeader}><div><Video size={16}/><strong>Camera thật</strong></div><span className={styles.modeLabel}>{cameraFacing==="user"?"Camera trước":"Camera sau"}</span></div>
       <div className={styles.camera}>
        <video ref={video} className={styles.video} playsInline autoPlay muted aria-label="Hình ảnh camera thật" style={{display:running||loading?undefined:"none",transform:mirror?"scaleX(-1)":"none"}}/>
        {!running&&!loading&&<div className={styles.emptyCamera}><Video size={31}/><b>Chưa bật camera</b><small>Chọn bài tập và bắt đầu</small></div>}
        {(running||loading)&&<span className={styles.liveBadge}>{loading?"ĐANG KHỞI ĐỘNG":switching?"ĐỔI CAMERA":paused?"TẠM DỪNG":"● TRỰC TIẾP"}</span>}
       </div>
      </section>
      <section className={styles.visionTile} aria-label="Bộ khung AI độc lập">
       <div className={styles.visionTileHeader}><div><ScanLine size={16}/><strong>Khung xương AI</strong></div><span className={styles.aiModeLabel}>{running?"33 khớp":"POSE"}</span></div>
       <div className={styles.poseFrame}>
        <div className={styles.poseGrid} aria-hidden="true"/>
        <canvas ref={canvas} className={styles.poseCanvas} aria-label="Các điểm khớp và đường nối từ MediaPipe, không kèm hình camera" role="img" style={{transform:mirror?"scaleX(-1)":"none"}}/>
        {!running&&!loading&&<div className={styles.posePlaceholder}><Activity size={36}/><b>Bộ khung AI</b><small>Chuyển động đồng bộ với camera</small></div>}
        {loading&&<div className={styles.posePlaceholder}><ScanLine size={34}/><b>Đang nạp AI…</b><small>Nhận diện tư thế trực tiếp</small></div>}
        {running&&<div className={styles.poseCounter}><strong>{reps}</strong><span>lần hợp lệ</span></div>}
        {running&&<div className={styles.poseFps}>{fps?"~"+fps+" FPS":"Đang dò khớp"}</div>}
       </div>
      </section>
     </div>
     <div className={styles.legend}><span><i className={styles.dot}/> Chấm cam = khớp</span><span><i className={styles.bar}/> Đường nối = xương</span><span>Video không tải lên máy chủ</span></div>
     {rewardFeedback&&<div className={styles.rewardNotice} role="status"><Zap size={16}/>{rewardFeedback}</div>}
     <div className={styles.feedback} role="status" aria-live="polite"><Activity size={20} color="#c46939"/><div><strong>{feedback}</strong><span>{metric} · {exercise.name} · {duration(seconds)}</span></div></div>
     {error&&<div role="alert" className={styles.error}>{error}</div>}
     <div className={styles.controls}>
      {!running&&!loading?<button className={styles.controlPrimary} onClick={start}><Play size={16}/> Bật camera & bắt đầu</button>:<button className={styles.controlPrimary} disabled={loading} onClick={pauseToggle}>{paused?<Play size={16}/>:<Pause size={16}/>} {loading?"Đang khởi động…":paused?"Tiếp tục":"Tạm dừng"}</button>}
      <button className={styles.control} disabled={!running&&!loading} onClick={()=>stop(true)}><VideoOff size={16}/> Kết thúc & lưu</button>
      <button className={styles.control} disabled={loading||switching} onClick={switchLens} aria-label={"Đổi camera trước sau, hiện đang dùng camera "+(cameraFacing==="user"?"trước":"sau")}><SwitchCamera size={16}/> {switching?"Đang đổi…":cameraFacing==="user"?"Chuyển cam sau":"Chuyển cam trước"}</button>
      <button className={styles.control} onClick={reset}><RefreshCcw size={15}/> Buổi tập mới</button>
      <button className={styles.control} onClick={()=>setMirror(value=>!value)}><Video size={15}/> {mirror?"Bỏ lật ảnh":"Lật ảnh"}</button>
     </div>
     <div className={styles.actions}><label className={styles.goal}><Target size={17}/> Mục tiêu <input aria-label="Mục tiêu số lần" type="number" min={1} max={200} value={goal} onChange={e=>setGoal(Math.max(1,Math.min(200,Number(e.target.value)||1)))}/> lần</label><span className={styles.chip}>{Math.min(100,Math.floor(reps/goal*100))}% hoàn thành</span></div>
     <div className={styles.progress} aria-label="Tiến độ mục tiêu"><div className={styles.progressFill} style={{width:Math.min(100,reps/goal*100)+"%"}}/></div>
     <div className={styles.tips}><strong><Info size={14} style={{verticalAlign:"middle",marginRight:5}}/> Cách tập đúng</strong><p>{exercise.instruction}</p><p><b>Vị trí camera:</b> {exercise.camera}</p></div>
    </div>
   </section>
   <div style={{display:"grid",gap:16,minWidth:0}}>
    <section className={styles.panel}><div className={styles.panelPad}>
     <div className={styles.sectionHead}><div><h2><Timer size={17} style={{verticalAlign:"middle",marginRight:6}}/> Lịch sử tập luyện</h2><p>{todayCount} buổi hôm nay · {cloud?"đồng bộ Turso":"lưu tại trình duyệt"}</p></div>{history.length>0&&<div style={{display:"flex",gap:7}}><button className={styles.control} onClick={downloadCsv} title="Tải CSV" aria-label="Tải lịch sử CSV"><Download size={16}/></button><button className={styles.danger} onClick={removeHistory} title="Xóa lịch sử">Xóa</button></div>}</div>
     <div className={styles.list}>{!storageReady?<div className={styles.empty}>Đang tải lịch sử…</div>:history.length===0?<div className={styles.empty}>Chưa có buổi tập. Hoàn thành vài động tác và bấm Kết thúc & lưu để ghi lại.</div>:history.slice(0,8).map(h=><div className={styles.history} key={h.id}><div><strong>{EXERCISES.find(e=>e.id===h.exercise)?.name||h.exercise}</strong><span>{new Date(h.at).toLocaleString("vi-VN")} · {duration(h.seconds)}</span></div><b>{h.reps} lần</b></div>)}</div>
     <p className={styles.footer}>{cloud?"Lịch sử đồng bộ với tài khoản qua Turso; bản sao trên máy hỗ trợ khi mạng lỗi.":"Bản mẫu chỉ lưu lịch sử trên thiết bị này."} Không lưu video hoặc ảnh cơ thể.</p>{cloudError&&<p className={styles.error} role="alert">{cloudError}</p>}
    </div></section>
   </div>
  </div>
 </div>;
}
