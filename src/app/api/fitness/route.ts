import {z} from "zod";
import {requireUser} from "@/lib/server/auth";
import {getDatabase} from "@/lib/server/turso";
import {ApiError,failure,json,readJson} from "@/lib/server/http";
import {eligibleFitnessReward,fitnessAward} from "@/lib/rewards";
export const runtime="nodejs";
const exercise=z.enum(["squat","chair","pushup","jack","knees","press","arms"]);
const input=z.object({id:z.string().uuid(),exercise,reps:z.number().int().min(1).max(500),seconds:z.number().int().min(0).max(7200)}).strict();
const points:Record<z.infer<typeof exercise>,number>={squat:2,chair:1.5,pushup:3,jack:2.5,knees:2,press:1.5,arms:1};
function map(r:Record<string,unknown>){
 return {id:String(r.session_id),exercise:String(r.exercise),reps:Number(r.reps),seconds:Number(r.duration_seconds),points:Number(r.points),at:String(r.created_at)};
}
export async function GET(r:Request){
 try{
  const user=await requireUser(r);
  const db=await getDatabase();
  const result=await db.execute({sql:"SELECT session_id,exercise,reps,duration_seconds,points,created_at FROM app_fitness_sessions WHERE user_id=:uid ORDER BY created_at DESC,session_id DESC LIMIT 100",args:{uid:user.uid}});
  return json({sessions:result.rows.map(row=>map(row as unknown as Record<string,unknown>))});
 }catch(e){return failure(e);}
}
export async function POST(r:Request){
 try{
  const user=await requireUser(r);
  const body=await readJson(r,input,3000);
  const db=await getDatabase();
  const day=new Date().toISOString().slice(0,10);
  const count=await db.execute({sql:"SELECT COUNT(*) as n FROM app_fitness_sessions WHERE user_id=:uid AND substr(created_at,1,10)=:day",args:{uid:user.uid,day}});
  if(Number(count.rows[0]?.n||0)>=200)throw new ApiError(429,"FITNESS_DAILY_LIMIT","Đã đạt giới hạn lưu 200 buổi tập hôm nay.");
  const score=Math.round(body.reps*points[body.exercise]*10)/10;
  const tx=await db.transaction("write");
  let awarded=0;
  try{
   const saved=await tx.execute({sql:"INSERT INTO app_fitness_sessions(session_id,user_id,exercise,reps,duration_seconds,points) VALUES(:id,:uid,:exercise,:reps,:seconds,:points) ON CONFLICT(session_id) DO NOTHING",args:{id:body.id,uid:user.uid,exercise:body.exercise,reps:body.reps,seconds:body.seconds,points:score}});
   if(saved.rowsAffected>0&&eligibleFitnessReward(body)){
    const awardedToday=await tx.execute({sql:"SELECT COUNT(*) n FROM app_points_ledger WHERE user_id=:uid AND source_key LIKE :prefix AND substr(created_at,1,10)=:day",args:{uid:user.uid,prefix:"fitness:"+day+":%",day}});
    if(Number(awardedToday.rows[0]?.n||0)<fitnessAward.maxDistinctPerUtcDay){
     const names:Record<z.infer<typeof exercise>,string>={squat:"Squat",chair:"Ngồi – đứng",pushup:"Chống đẩy",jack:"Jumping Jack",knees:"Nâng gối",press:"Đẩy tay",arms:"Giơ tay"};
     const event=await tx.execute({sql:"INSERT INTO app_points_ledger(event_id,user_id,source_key,kind,amount,label) VALUES(:id,:uid,:source,'practice',:amount,:label) ON CONFLICT(user_id,source_key) DO NOTHING",args:{id:crypto.randomUUID(),uid:user.uid,source:"fitness:"+day+":"+body.exercise,amount:fitnessAward.perSession,label:"Vận động nhẹ · "+names[body.exercise]}});
     awarded=event.rowsAffected?fitnessAward.perSession:0;
    }
   }
   await tx.commit();
  }catch(e){await tx.rollback().catch(()=>{});throw e;}finally{tx.close();}
  const result=await db.execute({sql:"SELECT session_id,exercise,reps,duration_seconds,points,created_at FROM app_fitness_sessions WHERE user_id=:uid AND session_id=:id",args:{uid:user.uid,id:body.id}});
  if(!result.rows.length)throw new ApiError(409,"SESSION_DUPLICATE","Mã buổi tập đã được sử dụng.");
  return json({session:map(result.rows[0] as unknown as Record<string,unknown>),awarded},201);
 }catch(e){return failure(e);}
}
export async function DELETE(r:Request){
 try{
  const user=await requireUser(r);
  const db=await getDatabase();
  const id=new URL(r.url).searchParams.get("id");
  if(id!==null&&!z.string().uuid().safeParse(id).success)throw new ApiError(400,"FITNESS_ID","Mã buổi tập không hợp lệ.");
  await db.execute(id?{sql:"DELETE FROM app_fitness_sessions WHERE user_id=:uid AND session_id=:id",args:{uid:user.uid,id}}:{sql:"DELETE FROM app_fitness_sessions WHERE user_id=:uid",args:{uid:user.uid}});
  return json({ok:true});
 }catch(e){return failure(e);}
}
