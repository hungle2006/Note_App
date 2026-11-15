import type {Client} from '@libsql/client';
import {ApiError} from './http';

export type LeaderboardEntry={rank:number;nickname:string;earned:number;isMe:boolean};
export type LeaderboardData={
 top:LeaderboardEntry[];
 me:{joined:boolean;nickname:string;rank:number|null;earned:number};
 participants:number;
};

/** Rank earned virtual points, not spendable balance: redeeming a pet must never reduce rank. */
export function leaderboardRepository(db:Client){
 return {
  async list(uid:string):Promise<LeaderboardData>{
   const [board,profile,earned]=await db.batch([
    {sql:`WITH scored AS (
      SELECT p.user_id,p.nickname,
        COALESCE(SUM(CASE WHEN l.kind='practice' AND l.amount>0 THEN l.amount ELSE 0 END),0) earned
      FROM app_leaderboard_profiles p
      LEFT JOIN app_points_ledger l ON l.user_id=p.user_id
      WHERE p.visible=1
      GROUP BY p.user_id,p.nickname
     ),ranked AS (
      SELECT user_id,nickname,earned,
       ROW_NUMBER() OVER(ORDER BY earned DESC,nickname COLLATE NOCASE ASC,user_id ASC) place,
       COUNT(*) OVER() participant_count
      FROM scored
     )
     SELECT user_id,nickname,earned,place,participant_count FROM ranked
     WHERE place<=10 OR user_id=? ORDER BY place ASC`,args:[uid]},
    {sql:'SELECT nickname,visible FROM app_leaderboard_profiles WHERE user_id=?',args:[uid]},
    {sql:"SELECT COALESCE(SUM(CASE WHEN kind='practice' AND amount>0 THEN amount ELSE 0 END),0) earned FROM app_points_ledger WHERE user_id=?",args:[uid]}
   ],'read');
   const joined=profile.rows.length>0&&Number(profile.rows[0].visible)===1;
   const myRow=board.rows.find(row=>String(row.user_id)===uid);
   return {
    top:board.rows.filter(row=>Number(row.place)<=10).map(row=>({
     rank:Number(row.place),nickname:String(row.nickname),earned:Number(row.earned),isMe:String(row.user_id)===uid
    })),
    me:{joined,nickname:profile.rows.length?String(profile.rows[0].nickname):'',rank:joined&&myRow?Number(myRow.place):null,earned:Number(earned.rows[0]?.earned??0)},
    participants:board.rows.length?Number(board.rows[0].participant_count):0
   };
  },
  async setVisible(uid:string,visible:boolean,nickname?:string){
   if(!visible){
    await db.execute({sql:'UPDATE app_leaderboard_profiles SET visible=0 WHERE user_id=?',args:[uid]});
    return;
   }
   const name=nickname?.trim().replace(/\s+/g,' ')||'';
   if(name.length<2||name.length>24||!instructionsSafeName(name))
    throw new ApiError(400,'INVALID_NICKNAME','Biệt danh cần 2–24 ký tự, không chứa email hoặc đường dẫn.');
   await db.execute({sql:`INSERT INTO app_leaderboard_profiles(user_id,nickname,visible) VALUES(?,?,1)
    ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname,visible=1`,args:[uid,name]});
  }
 };
}

/** Public pseudonyms must not become a contact-discovery or link-sharing channel. */
function instructionsSafeName(value:string){
 return /^[\p{L}\p{M}\p{N} ._-]+$/u.test(value)
  && !value.includes('..')
  && !/\b(?:https?|www)\b/i.test(value);
}
