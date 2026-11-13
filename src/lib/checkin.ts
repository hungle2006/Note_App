export const CHECKIN_DAYS=49;
export function vietnamDay(now=new Date()){return new Date(now.getTime()+7*3600000).toISOString().slice(0,10);}
export function nextStreak(last:{day:string;streak:number}|undefined,day:string){
 const previous=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return last?.day===previous?last.streak+1:1;
}
export function checkinReward(streak:number){const cycle=(streak-1)%49+1;return 10+(cycle%7===0?20:0)+(cycle===49?100:0);}
export type CheckinState={today:string;claimed:boolean;streak:number;cycleDay:number;nextReward:number;days:{day:string;streak:number;amount:number}[]};
