export type ExerciseId = "squat" | "chair" | "pushup" | "jack" | "knees" | "press" | "arms";
export type Landmark = {x:number; y:number; z?:number; visibility?:number};
export type Exercise = {id:ExerciseId; name:string; short:string; instruction:string; camera:string; points:number; goal:number};
export const EXERCISES:Exercise[] = [
 {id:"squat",name:"Squat",short:"Đứng lên ngồi xuống",instruction:"Đứng đủ xa để camera thấy đầu, hông và chân. Hạ hông, gập gối rồi đứng thẳng trở lại.",camera:"Để máy trước mặt hoặc nghiêng nhẹ, thấy tới cổ chân càng tốt.",points:2,goal:12},
 {id:"chair",name:"Ngồi – đứng với ghế",short:"Vận động tại chỗ",instruction:"Đặt ghế cố định. Từ đứng thẳng, ngồi xuống có kiểm soát rồi đứng dậy.",camera:"Thấy vai, hông và đầu gối. Tránh ghế xoay.",points:1.5,goal:10},
 {id:"jack",name:"Jumping Jack",short:"Bật nhảy dang tay chân",instruction:"Đồng thời dang hai chân và đưa hai tay lên cao, rồi trở về tư thế khép.",camera:"Để camera thấy toàn thân, tốt nhất tới bàn chân.",points:2.5,goal:15},
 {id:"knees",name:"High Knees",short:"Nâng gối luân phiên",instruction:"Đứng thẳng, lần lượt nâng một gối lên cao gần hông. Đếm theo từng bên.",camera:"Camera cần thấy rõ cả hai đầu gối.",points:2,goal:20},
 {id:"press",name:"Overhead Press",short:"Đẩy hai tay qua đầu",instruction:"Co hai khuỷu tay, hai tay ngang vai, rồi duỗi thẳng cả hai lên cao và hạ về.",camera:"Thấy vai, khuỷu tay và cổ tay cả hai bên.",points:1.5,goal:12},
 {id:"pushup",name:"Push-up",short:"Chống đẩy",instruction:"Giữ thân người thành đường thẳng, hạ hai khuỷu có kiểm soát rồi đẩy lên.",camera:"Đặt máy ngang tầm người, nhìn từ cạnh và thấy ít nhất một tay.",points:3,goal:8},
 {id:"arms",name:"Arm Raise",short:"Giơ hai tay ngang vai",instruction:"Từ tay xuôi cạnh thân, từ từ giơ hai tay sang ngang vai rồi hạ xuống.",camera:"Thấy đủ hai vai và hai cổ tay.",points:1,goal:15}
];
export const CONNECTIONS:[number,number][] = [
 [0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[3,7],[6,8],[9,10],
 [11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
 [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]
];
export type MotionState={phase:"ready"|"up"|"down";lastRep:number;downAt:number;lastSide:"left"|"right"|null;stableAt:number;count:number};
export function newMotionState():MotionState{return {phase:"ready",lastRep:0,downAt:0,lastSide:null,stableAt:0,count:0};}
function visible(p:Landmark|undefined){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=0.5;}
function point(l:Landmark[],i:number){return visible(l[i])?l[i]:null;}
function mid(a:Landmark|null,b:Landmark|null):Landmark|null{
 if(a&&b)return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 return a||b;
}
function distance(a:Landmark|null,b:Landmark|null){return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
export function angle(a:Landmark|null,b:Landmark|null,c:Landmark|null):number|null{
 if(!a||!b||!c)return null;
 const u={x:a.x-b.x,y:a.y-b.y},v={x:c.x-b.x,y:c.y-b.y};
 const d=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
 return d<0.00001?null:Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/d)))*180/Math.PI;
}
const isNumber=(n:number|null):n is number => n!==null&&Number.isFinite(n);
export type MotionResult={state:MotionState;accepted:boolean;message:string;metric:string;ready:boolean};
export function processMotion(id:ExerciseId,l:Landmark[],current:MotionState,now:number):MotionResult{
 const state={...current};let message="Giữ toàn thân trong khung hình";let metric="—";let down=false,up=false,ok=false,interval=650;
 const shoulderL=point(l,11),shoulderR=point(l,12),hipL=point(l,23),hipR=point(l,24);
 const kneeL=point(l,25),kneeR=point(l,26),ankleL=point(l,27),ankleR=point(l,28);
 const elbowL=point(l,13),elbowR=point(l,14),wristL=point(l,15),wristR=point(l,16);
 const shoulder=mid(shoulderL,shoulderR),hip=mid(hipL,hipR),knee=mid(kneeL,kneeR);
 const torso=distance(shoulder,hip);
 if(torso<0.065)return {state:{...state,phase:"ready",stableAt:0},accepted:false,message:"Lùi ra và để camera thấy rõ vai, hông",metric,ready:false};
 if(id==="squat"||id==="chair"){
   const left=angle(hipL,kneeL,ankleL),right=angle(hipR,kneeR,ankleR);
   const vals=[left,right].filter(isNumber);
   const kneeDeg=vals.length?Math.min(...vals):null;
   // Không bắt buộc thấy cổ chân: quan sát tỉ lệ hông–gối khi đứng trước camera.
   const ratio=hip&&knee?Math.abs(knee.y-hip.y)/torso:0;
   ok=!!hip&&!!knee;
   down=isNumber(kneeDeg)?kneeDeg<(id==="chair"?112:118):ratio<0.68;
   up=isNumber(kneeDeg)?kneeDeg>151:ratio>0.95;
   metric=isNumber(kneeDeg)?Math.round(kneeDeg)+"° góc gối":"Hông–gối "+Math.round(ratio*100)+"%";
   message=down?"Đã hạ xuống · đứng thẳng lên":up?"Tốt! Hạ hông có kiểm soát":"Hạ sâu hơn một chút";
   interval=id==="chair"?950:800;
 } else if(id==="jack"){
   const span=distance(shoulderL,shoulderR);
   const feet=distance(ankleL,ankleR)||distance(kneeL,kneeR);
   ok=!!wristL&&!!wristR&&span>0.04&&feet>0;
   const spread=span?feet/span:0;
   down=!!wristL&&!!wristR&&!!shoulder&&wristL.y<shoulder.y&&wristR.y<shoulder.y&&spread>1.15;
   up=!!wristL&&!!wristR&&!!shoulder&&wristL.y>shoulder.y+0.07&&wristR.y>shoulder.y+0.07&&spread<1.05;
   metric="Dang chân "+spread.toFixed(1)+"× vai";message=down?"Tay cao, chân dang · trở về":"Dang chân và giơ cả hai tay";interval=480;
 } else if(id==="press"||id==="arms"){
   const left=angle(shoulderL,elbowL,wristL),right=angle(shoulderR,elbowR,wristR);
   ok=!!shoulderL&&!!shoulderR&&!!wristL&&!!wristR;
   if(id==="press"){
     down=ok&&!!elbowL&&!!elbowR&&wristL!.y<shoulderL!.y-0.07&&wristR!.y<shoulderR!.y-0.07&&(!isNumber(left)||left>135)&&(!isNumber(right)||right>135);
     up=ok&&wristL!.y>shoulderL!.y-0.04&&wristR!.y>shoulderR!.y-0.04;
     message=down?"Hai tay đã lên · từ từ hạ xuống":"Đẩy hai tay qua đầu";
   }else{
     const spreadL=distance(shoulderL,wristL),spreadR=distance(shoulderR,wristR);
     down=ok&&Math.abs(wristL!.y-shoulderL!.y)<0.11&&Math.abs(wristR!.y-shoulderR!.y)<0.11&&spreadL>torso*0.6&&spreadR>torso*0.6;
     up=ok&&wristL!.y>shoulderL!.y+torso*0.9&&wristR!.y>shoulderR!.y+torso*0.9;
     message=down?"Đúng tầm vai · hạ tay xuống":"Giơ cả hai tay ngang vai";
   }
   metric=isNumber(left)?Math.round(left)+"° khuỷu trái":"Theo dõi hai tay";interval=700;
 }else if(id==="pushup"){
   const a=angle(shoulderL,elbowL,wristL)??angle(shoulderR,elbowR,wristR);
   const body=angle(shoulderL,hipL,ankleL||kneeL)??angle(shoulderR,hipR,ankleR||kneeR);
   const horizontal=shoulder&&hip?Math.abs(Math.atan2(shoulder.y-hip.y,shoulder.x-hip.x))*180/Math.PI:90;
   const horizontallyAligned=horizontal<35||horizontal>145;
   ok=isNumber(a)&&isNumber(body)&&body>143&&horizontallyAligned;
   down=ok&&a!<113;up=ok&&a!>151;
   metric=isNumber(a)?Math.round(a)+"° khuỷu tay":"Chưa thấy khuỷu tay";
   message=!ok?"Giữ thân thẳng, đặt camera ngang người":down?"Đã hạ · đẩy người lên":"Hạ cả thân người, không chỉ gập tay";interval=850;
 }else if(id==="knees"){
   ok=!!hip&&!!kneeL&&!!kneeR;
   const liftL=ok&&kneeL!.y<hip!.y+torso*0.6&&kneeR!.y>hip!.y+torso*0.75;
   const liftR=ok&&kneeR!.y<hip!.y+torso*0.6&&kneeL!.y>hip!.y+torso*0.75;
   const side=liftL?"left":liftR?"right":null;
   metric=side==="left"?"Gối trái lên":side==="right"?"Gối phải lên":"Nâng gối tới gần hông";
   message=side?"Tốt! Đổi sang chân còn lại":"Nâng gối trái/phải luân phiên";
   if(!ok)return {state:{...state,stableAt:0},accepted:false,message:"Để camera thấy cả hai đầu gối",metric,ready:false};
   if(state.stableAt===0)state.stableAt=now;
   const accepted=!!side&&side!==state.lastSide&&now-state.lastRep>=320&&now-state.stableAt>=250;
   if(accepted){state.count++;state.lastRep=now;state.lastSide=side;}
   if(!side&&now-state.lastRep>1700)state.lastSide=null;
   return {state,accepted,message,metric,ready:true};
 }
 if(!ok){state.phase="ready";state.stableAt=0;return {state,accepted:false,message:"Không đủ điểm khớp · chỉnh góc camera",metric,ready:false};}
 if(state.stableAt===0)state.stableAt=now;
 if(now-state.stableAt<300)return {state,accepted:false,message:"Đang ổn định bộ khung…",metric,ready:true};
 let accepted=false;
 if(state.phase==="ready"){state.phase=up?"up":down?"down":"ready";if(down)state.downAt=now;}
 else if(state.phase==="up"&&down){state.phase="down";state.downAt=now;}
 else if(state.phase==="down"){
   if(now-state.downAt>10000){state.phase="ready";message="Thử lại động tác từ đầu";}
   else if(up&&now-state.downAt>=140){state.phase="up";if(now-state.lastRep>=interval){state.lastRep=now;state.count++;accepted=true;message="Hoàn thành một lần!";}}
 }
 return {state,accepted,message,metric,ready:true};
}
