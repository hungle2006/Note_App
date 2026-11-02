"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,Clock,Heart,Pause,Play,RefreshCcw,ShieldCheck} from "lucide-react";
import type {LibraryExercise} from "@/lib/fitness-catalog";
import styles from "./fitness.module.css";
const format=(seconds:number)=>String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
export function GuidedExerciseSession({exercise,onComplete}:{exercise:LibraryExercise;onComplete:(id:string,seconds:number)=>void}){
 const [remaining,setRemaining]=useState(exercise.seconds);
 const [elapsed,setElapsed]=useState(0);
 const [running,setRunning]=useState(false);
 const [done,setDone]=useState(false);
 const lastTick=useRef(0);
 const completed=useRef(false);
 useEffect(()=>{
  if(!running)return;
  lastTick.current=Date.now();
  const handle=setInterval(()=>{
   const now=Date.now(),delta=Math.min(3,Math.floor((now-lastTick.current)/1000));
   if(delta<=0)return;lastTick.current+=delta*1000;
   setRemaining(old=>Math.max(0,old-delta));
   setElapsed(old=>old+delta);
  },250);
  return()=>clearInterval(handle);
 },[running]);
 useEffect(()=>{
  if(remaining===0&&!completed.current){
   completed.current=true;setRunning(false);setDone(true);
   onComplete(exercise.id,exercise.seconds);
  }
 },[remaining,exercise.id,exercise.seconds,onComplete]);
 function finish(){
  if(completed.current)return;
  completed.current=true;setRunning(false);setDone(true);
  if(elapsed>=30)onComplete(exercise.id,elapsed);
 }
 function reset(){
  setRemaining(exercise.seconds);setElapsed(0);setDone(false);
  setRunning(false);completed.current=false;
 }
 const percent=Math.round((exercise.seconds-remaining)/exercise.seconds*100);
 return <section className={styles.panel+" "+styles.guideStudio} aria-label="Bài tập hướng dẫn có hẹn giờ">
  <div className={styles.panelPad}>
   <div className={styles.sectionHead}><div><h2><Clock size={18} style={{verticalAlign:"middle",marginRight:7}}/> Đồng hồ hướng dẫn</h2><p>Không dùng camera, không giả lập AI đếm động tác</p></div><span className={styles.chip}>HẸN GIỜ</span></div>
   <div className={styles.guideStage}>
    <div className={styles.guideClock}>
     <span className={styles.guideClockLabel}>THỜI GIAN CÒN LẠI</span>
     <strong aria-live="off">{format(remaining)}</strong>
     <span className={styles.guideClockSub}>{done?"Tuyệt! Em đã hoàn thành.":running?"Hãy tập theo hướng dẫn vừa sức.":"Tập cùng nhịp thở, không cần vội."}</span>
     <div className={styles.guideProgress}><div style={{width:percent+"%"}}/></div>
     <div className={styles.guideClockActions}>
      {!done?<button className={styles.controlPrimary} onClick={()=>setRunning(old=>!old)}>{running?<Pause size={16}/>:<Play size={16}/>} {running?"Tạm dừng":elapsed>0?"Tiếp tục":"Bắt đầu tính giờ"}</button>:<span className={styles.guideSuccess}><CheckCircle2 size={18}/> Hoàn thành</span>}
      <button className={styles.control} disabled={(!running&&elapsed===0)||done} onClick={finish}>Kết thúc</button>
      <button className={styles.control} onClick={reset}><RefreshCcw size={15}/> Làm lại</button>
     </div>
    </div>
    <div className={styles.guideInstructions}>
     <span className={styles.kicker}><Heart size={14}/> VỪA SỨC & AN TOÀN</span>
     <h3>{exercise.name}</h3>
     <p>{exercise.instruction}</p>
     <div className={styles.guideFacts}>
      <span>Độ khó: <strong>{exercise.level}</strong></span>
      <span>Dụng cụ: <strong>{exercise.equipment}</strong></span>
      <span>Gợi ý: <strong>{exercise.seconds} giây</strong></span>
     </div>
     <p className={styles.guideNotice}><ShieldCheck size={16}/> Bài có đồng hồ hướng dẫn, không có AI đếm hoặc chấm tư thế. Thời gian hoàn thành lưu trên thiết bị, không cộng Điểm Nắng. Nghỉ ngay nếu khó chịu.</p>
    </div>
   </div>
  </div>
 </section>;
}
