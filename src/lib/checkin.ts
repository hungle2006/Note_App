export const CHECKIN_DAYS=49;
export const CHECKIN_DAILY=3;
export const CHECKIN_WEEKLY=5;
export const CHECKIN_TOTAL=CHECKIN_DAYS*CHECKIN_DAILY+7*CHECKIN_WEEKLY;
export function vietnamDay(now=new Date()){return new Date(now.getTime()+7*3600000).toISOString().slice(0,10);}
export function nextStreak(last:{day:string;streak:number}|undefined,day:string){
 const previous=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return last?.day===previous?last.streak+1:1;
}
export function checkinReward(streak:number){const cycle=(streak-1)%49+1;return CHECKIN_DAILY+(cycle%7===0?CHECKIN_WEEKLY:0);}
export type CheckinState={today:string;claimed:boolean;streak:number;cycleDay:number;nextReward:number;days:{day:string;streak:number;amount:number}[]};
