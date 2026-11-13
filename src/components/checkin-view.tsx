"use client";
import {useEffect,useState} from 'react';
import {CalendarCheck,Check,Flame,Gift,Coins,RefreshCw} from 'lucide-react';
import {api} from '@/lib/client-api';
import {checkinReward,nextStreak,vietnamDay,type CheckinState} from '@/lib/checkin';
import type {RewardWallet} from '@/lib/rewards';
import {Title} from './ui';
const demoKey='notelab-checkin-demo-v1';
function demoState():CheckinState{let days:CheckinState['days']=[];try{days=JSON.parse(localStorage.getItem(demoKey)||'[]');}catch{}const today=vietnamDay(),claimed=days[0]?.day===today,streak=claimed?days[0].streak:nextStreak(days[0],today)-1;return {today,claimed,streak,cycleDay:claimed?(streak-1)%49+1:streak%49,nextReward:checkinReward(claimed?streak:streak+1),days};}
export function CheckinView({demo,onWallet}:{demo:boolean;onWallet:(wallet:RewardWallet)=>void}){
 const [state,setState]=useState<CheckinState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setError('');try{setState(demo?demoState():(await api<{checkin:CheckinState}>('/checkin')).checkin);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);const focus=()=>void load();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[demo]);
 async function claim(){setBusy(true);setError('');try{
  if(demo){let d=demoState();if(!d.claimed){d.days=[{day:d.today,streak:d.streak+1,amount:d.nextReward},...d.days].slice(0,49);localStorage.setItem(demoKey,JSON.stringify(d.days));}setState(demoState());setNotice('Đã điểm danh thử. Tài khoản thật sẽ cộng xu vào ví Điểm Nắng.');}
  else {const r=await api<{checkin:CheckinState;wallet:RewardWallet}>('/checkin',{method:'POST'});setState(r.checkin);onWallet(r.wallet);setNotice('Đã nhận '+r.checkin.days[0].amount+' xu vào ví Điểm Nắng hôm nay!');}
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const progress=state?.cycleDay||0;
 return <div className="new-task checkin-task"><Title eyebrow="MỖI NGÀY MỘT BƯỚC NHỎ" title="Điểm danh 7 tuần" description="49 ngày vun đắp thói quen học tập. Ghé mỗi ngày, nhận thêm xu vào ví Điểm Nắng."/>
 <section className="checkin-hero panel"><div><span className="task-kicker"><CalendarCheck size={17}/> HẸN EM MỖI NGÀY</span><h2>Một lần ghé.<br/>Một chút tiến bộ.</h2><p>10 xu mỗi ngày · Thêm 20 xu ở mỗi mốc 7 ngày · Thêm 100 xu khi hoàn thành ngày 49.</p><button className="button primary" onClick={claim} disabled={busy||!state||state.claimed}><CalendarCheck size={18}/>{busy?'Đang nhận xu…':state?.claimed?'Đã điểm danh hôm nay':`Điểm danh · +${state?.nextReward||10} xu`}</button><small>Ngày mới bắt đầu lúc 00:00 giờ Việt Nam.</small></div><div className="streak-medallion"><Flame size={45}/><strong>{state?.streak??'–'}</strong><span>ngày liên tiếp</span></div></section>
 {error&&<div className="notice" role="alert">{error}<button className="button secondary" onClick={load}><RefreshCw size={16}/>Thử lại</button></div>}{notice&&<p className="notice" role="status">{notice}</p>}
 <div className="checkin-stats"><div className="panel"><Coins/><strong>10 xu</strong><span>Mỗi ngày</span></div><div className="panel"><Gift/><strong>+20 xu</strong><span>Mỗi tuần liên tiếp</span></div><div className="panel"><Flame/><strong>730 xu</strong><span>Trọn 49 ngày</span></div></div>
 <section className="panel checkin-calendar"><div className="section-row"><div><span className="eyebrow">HÀNH TRÌNH HIỆN TẠI</span><h2>{progress}/49 ngày</h2></div><span className="tag">7 TUẦN</span></div><progress value={progress} max={49} aria-label="Tiến độ điểm danh"/>
 {Array.from({length:7},(_,week)=><div className="checkin-week" key={week}><span>Tuần {week+1}</span><div>{Array.from({length:7},(_,j)=>{const day=week*7+j+1,done=day<=progress;return <div key={day} className={'checkin-day '+(done?'done ':'')+(day===progress+1?'next':'')} aria-label={'Ngày '+day+', '+(done?'đã hoàn thành':checkinReward(day)+' xu')}><span>{done?<Check size={17}/>:day%7===0?<Gift size={17}/>:<Coins size={17}/>}</span><strong>{day}</strong><small>+{checkinReward(day)}</small></div>;})}</div></div>)}
 <p className="muted">Bỏ lỡ một ngày sẽ bắt đầu lại chuỗi; xu đã nhận vẫn được giữ. Sau ngày 49, em tiếp tục một hành trình 7 tuần mới. Xu là Điểm Nắng trong ứng dụng.</p></section></div>;
}
