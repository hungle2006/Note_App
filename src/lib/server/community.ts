import type {Client} from '@libsql/client';
import {ApiError} from './http';
import {vietnamDay,nextStreak,checkinReward,type CheckinState} from '../checkin';
export function communityRepository(db:Client){
 async function checkins(uid:string,now=new Date()):Promise<CheckinState>{
  const day=vietnamDay(now),r=await db.execute({sql:'SELECT day,streak,amount FROM app_checkins WHERE user_id=? ORDER BY day DESC LIMIT 49',args:[uid]});
  const days=r.rows.map(r=>({day:String(r.day),streak:Number(r.streak),amount:Number(r.amount)}));
  const claimed=days[0]?.day===day;const streak=claimed?days[0].streak:nextStreak(days[0],day)-1;
  return {today:day,claimed,streak,cycleDay:claimed?(streak-1)%49+1:streak%49,nextReward:checkinReward(claimed?streak:streak+1),days};
 }
 async function member(uid:string,id:string){
  const r=await db.execute({sql:'SELECT * FROM app_peer_threads WHERE id=? AND (member_a=? OR member_b=?)',args:[id,uid,uid]});
  if(!r.rows.length)throw new ApiError(404,'THREAD_NOT_FOUND','Không tìm thấy cuộc trò chuyện.');return r.rows[0];
 }
 async function blocked(a:string,b:string){const r=await db.execute({sql:'SELECT owner_id FROM app_peer_blocks WHERE (owner_id=? AND blocked_id=?) OR (owner_id=? AND blocked_id=?)',args:[a,b,b,a]});return r.rows.length>0;}
 return {
  checkins,
  async claim(uid:string,now=new Date()){
   const day=vietnamDay(now),tx=await db.transaction('write');
   try{
    const found=await tx.execute({sql:'SELECT day,streak FROM app_checkins WHERE user_id=? ORDER BY day DESC LIMIT 1',args:[uid]});
    const last=found.rows[0];
    if(!last||String(last.day)!==day){
     const streak=nextStreak(last?{day:String(last.day),streak:Number(last.streak)}:undefined,day),amount=checkinReward(streak);
     await tx.execute({sql:'INSERT INTO app_checkins(user_id,day,streak,amount) VALUES(?,?,?,?)',args:[uid,day,streak,amount]});
     await tx.execute({sql:"INSERT INTO app_points_ledger(event_id,user_id,source_key,kind,amount,label) VALUES(?,?,?,'practice',?,?)",args:[crypto.randomUUID(),uid,'checkin:'+day,amount,'Điểm danh ngày '+streak+' · '+day]});
    }
    await tx.commit();
   }catch(e){await tx.rollback();throw e;}finally{tx.close();}
   return checkins(uid,now);
  },
  async open(uid:string,name:string,peer:string,peerName:string){
   if(uid===peer)throw new ApiError(400,'SELF_CHAT','Hãy chọn một người bạn khác.');
   if(await blocked(uid,peer))throw new ApiError(403,'BLOCKED','Không thể mở cuộc trò chuyện này.');
   const [a,b]=[uid,peer].sort(),id=crypto.randomUUID();
   await db.execute({sql:'INSERT INTO app_peer_threads(id,member_a,member_b,name_a,name_b) VALUES(?,?,?,?,?) ON CONFLICT(member_a,member_b) DO UPDATE SET name_a=excluded.name_a,name_b=excluded.name_b',args:[id,a,b,a===uid?name:peerName,a===uid?peerName:name]});
   const r=await db.execute({sql:'SELECT id FROM app_peer_threads WHERE member_a=? AND member_b=?',args:[a,b]});return String(r.rows[0].id);
  },
  async threads(uid:string){
   const r=await db.execute({sql:`SELECT t.*,m.body,m.created_at,(SELECT COUNT(*) FROM app_peer_messages u WHERE u.thread_id=t.id AND u.sender_id<>? AND u.seq>CASE WHEN t.member_a=? THEN t.read_a ELSE t.read_b END) unread,
    EXISTS(SELECT 1 FROM app_peer_blocks b WHERE b.owner_id=? AND b.blocked_id=CASE WHEN t.member_a=? THEN t.member_b ELSE t.member_a END) blocked
    FROM app_peer_threads t LEFT JOIN app_peer_messages m ON m.seq=(SELECT MAX(seq) FROM app_peer_messages WHERE thread_id=t.id)
    WHERE t.member_a=? OR t.member_b=? ORDER BY m.seq DESC,t.id LIMIT 100`,args:[uid,uid,uid,uid,uid,uid]});
   return r.rows.map(t=>({id:String(t.id),name:String(t.member_a===uid?t.name_b:t.name_a),peerId:String(t.member_a===uid?t.member_b:t.member_a),preview:String(t.body||'Bắt đầu một lời chào'),updatedAt:t.created_at?String(t.created_at):null,unread:Number(t.unread),blocked:Boolean(t.blocked)}));
  },
  async messages(uid:string,id:string,before?:number){
   const t=await member(uid,id);
   const r=await db.execute({sql:'SELECT * FROM app_peer_messages WHERE thread_id=? AND seq<? ORDER BY seq DESC LIMIT 51',args:[id,before||Number.MAX_SAFE_INTEGER]});
   const rows=r.rows.slice(0,50).reverse();
   const column=t.member_a===uid?'read_a':'read_b';
   if(rows.length)await db.execute({sql:`UPDATE app_peer_threads SET ${column}=MAX(${column},?) WHERE id=?`,args:[Number(rows.at(-1)!.seq),id]});
   return {messages:rows.map(m=>({id:String(m.id),seq:Number(m.seq),senderId:String(m.sender_id),body:String(m.body),createdAt:String(m.created_at)})),older:r.rows.length>50?Number(rows[0].seq):null};
  },
  async send(uid:string,id:string,body:string,messageId:string){
   const t=await member(uid,id),peer=String(t.member_a===uid?t.member_b:t.member_a);
   const tx=await db.transaction('write');try{
    const block=await tx.execute({sql:'SELECT 1 FROM app_peer_blocks WHERE (owner_id=? AND blocked_id=?) OR (owner_id=? AND blocked_id=?)',args:[uid,peer,peer,uid]});
    if(block.rows.length)throw new ApiError(403,'BLOCKED','Không thể nhắn tin. Hãy kiểm tra trạng thái chặn.');
    const existing=await tx.execute({sql:'SELECT id FROM app_peer_messages WHERE id=? AND thread_id=? AND sender_id=?',args:[messageId,id,uid]});
    if(!existing.rows.length){
     const recent=await tx.execute({sql:"SELECT COUNT(*) n FROM app_peer_messages WHERE sender_id=? AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 minute')",args:[uid]});
     if(Number(recent.rows[0].n)>=30)throw new ApiError(429,'SLOW_DOWN','Em gửi hơi nhanh. Đợi một phút rồi thử lại nhé.');
     await tx.execute({sql:'INSERT INTO app_peer_messages(id,thread_id,sender_id,body) VALUES(?,?,?,?)',args:[messageId,id,uid,body]});
    }
    await tx.commit();
   }catch(e){await tx.rollback();throw e;}finally{tx.close();}
  },
  async block(uid:string,id:string,enabled:boolean){const t=await member(uid,id),peer=String(t.member_a===uid?t.member_b:t.member_a);await db.execute({sql:enabled?'INSERT INTO app_peer_blocks(owner_id,blocked_id) VALUES(?,?) ON CONFLICT DO NOTHING':'DELETE FROM app_peer_blocks WHERE owner_id=? AND blocked_id=?',args:[uid,peer]});}
 };
}
