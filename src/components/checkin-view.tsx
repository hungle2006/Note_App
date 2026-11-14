"use client";
import {useEffect,useState} from 'react';
import {CalendarCheck,Check,Flame,Gift,Coins,RefreshCw,ChevronDown,ArrowUpRight} from 'lucide-react';
import {api} from '@/lib/client-api';
import {CHECKIN_DAILY,CHECKIN_WEEKLY,CHECKIN_TOTAL,checkinReward,nextStreak,vietnamDay,type CheckinState} from '@/lib/checkin';
import type {RewardWallet} from '@/lib/rewards';
import {Title} from './ui';
const demoKey='notelab-checkin-demo-v1';
function demoState():CheckinState{let days:CheckinState['days']=[];try{days=JSON.parse(localStorage.getItem(demoKey)||'[]');}catch{}const today=vietnamDay(),claimed=days[0]?.day===today,streak=claimed?days[0].streak:nextStreak(days[0],today)-1;return {today,claimed,streak,cycleDay:claimed?(streak-1)%49+1:streak%49,nextReward:checkinReward(claimed?streak:streak+1),days};}
export function CheckinView({demo,onWallet}:{demo:boolean;onWallet:(wallet:RewardWallet)=>void}){
 const [state,setState]=useState<CheckinState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[week,setWeek]=useState(0);
 async function load(){setError('');try{setState(demo?demoState():(await api<{checkin:CheckinState}>('/checkin')).checkin);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);const focus=()=>void load();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[demo]);
 async function claim(){setBusy(true);setError('');try{
  if(demo){let d=demoState();if(!d.claimed){d.days=[{day:d.today,streak:d.streak+1,amount:d.nextReward},...d.days].slice(0,49);localStorage.setItem(demoKey,JSON.stringify(d.days));}setState(demoState());setNotice('Đã điểm danh thử. Tài khoản thật sẽ cộng xu vào ví Điểm Nắng.');}
  else {const r=await api<{checkin:CheckinState;wallet:RewardWallet}>('/checkin',{method:'POST'});setState(r.checkin);onWallet(r.wallet);setNotice('Đã nhận '+r.checkin.days[0].amount+' xu vào ví Điểm Nắng hôm nay!');}
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const progress=state?.cycleDay||0;
 const currentDay=Math.min(49,state?.claimed?Math.max(1,progress):progress+1);
 useEffect(()=>{setWeek(Math.floor((currentDay-1)/7));},[currentDay]);
 const completed=Math.max(0,Math.min(7,progress-week*7));
 return <div className="new-task checkin-task attendance-page"><Title eyebrow="MỖI NGÀY MỘT CHÚT TIẾN BỘ" title="Điểm danh 7 tuần" description="Ghé học đều, nhận thêm Điểm Nắng."/>
 <div className="attendance-layout">
 <section className="attendance-today" aria-label="Điểm danh hôm nay">
  <div className="attendance-today-top"><span className="attendance-flame"><Flame size={22}/></span><span>CHUỖI HIỆN TẠI</span><strong>{state?.streak??'–'} <small>ngày</small></strong></div>
  <div className="attendance-today-copy"><div><span className="attendance-kicker">{state?.claimed?'HẸN MÌNH NGÀY MAI':'MỘT THÓI QUEN TỐT'}</span><h2>{state?.claimed?'Hôm nay đã hoàn thành.':'Sẵn sàng cho ngày mới?'}</h2><p>{state?.claimed?'Giữ nhịp học, từng ngày một.':'Một lần ghé học, thêm một bước tiến.'}</p></div><div className="attendance-reward"><Coins size={20}/><strong>{state?.nextReward||CHECKIN_DAILY}</strong><span>xu hôm nay</span></div></div>
  <button className="button attendance-claim" onClick={claim} disabled={busy||!state||state.claimed}>{state?.claimed?<Check size={18}/>:<CalendarCheck size={18}/>}<span>{busy?'Đang nhận xu…':!state?'Đang tải…':state.claimed?'Đã điểm danh hôm nay':`Điểm danh · +${state.nextReward} xu`}</span>{!state?.claimed&&<ArrowUpRight size={18}/>}</button>
  <small className="attendance-reset">Ngày mới bắt đầu lúc 00:00 · Giờ Việt Nam</small>
 </section>
 <section className="panel attendance-calendar" aria-label="Lịch điểm danh theo tuần">
  <header className="attendance-calendar-heading"><div><span className="attendance-kicker">HÀNH TRÌNH 49 NGÀY</span><h2>Hành trình của mình</h2></div><span className="attendance-progress-count"><strong>{progress}</strong>/49</span></header>
  <progress value={progress} max={49} aria-label="Tiến độ điểm danh"/>
  <nav className="attendance-weeks" aria-label="Chọn tuần điểm danh">{Array.from({length:7},(_,i)=><button key={i} type="button" aria-label={'Tuần '+(i+1)} aria-pressed={week===i} className={week===i?'selected':''} onClick={()=>setWeek(i)}><span>Tuần </span>{i+1}{progress>=(i+1)*7&&<Check size={11}/>}</button>)}</nav>
  <div className="attendance-week-heading"><strong>Tuần {week+1}</strong><span>{completed}/7 ngày hoàn thành</span></div>
  <div className="attendance-days">{Array.from({length:7},(_,i)=>{const day=week*7+i+1,done=day<=progress,today=day===currentDay;return <div key={day} className={'attendance-day'+(done?' done':'')+(today&&!done?' today':'')+(day%7===0?' milestone':'')} aria-label={'Ngày '+day+', '+(done?'đã hoàn thành':checkinReward(day)+' xu')} aria-current={today?'date':undefined}><div className="attendance-day-number">{done?<Check size={18}/>:day}{day%7===0&&!done&&<Gift className="attendance-day-gift" size={12}/>}</div><small>{done?'Đã nhận':'+'+checkinReward(day)}</small></div>;})}</div>
  <p className="attendance-week-bonus"><Gift size={16}/><span>Ngày {week*7+7}: 3 xu hằng ngày <strong>+ 5 xu thưởng tuần</strong></span></p>
  <details className="attendance-overview"><summary><span>Xem toàn bộ 49 ngày</span><ChevronDown size={16}/></summary><div className="attendance-overview-grid">{Array.from({length:49},(_,i)=><span key={i} className={'attendance-overview-day'+(i<progress?' done':'')} aria-label={'Ngày '+(i+1)+(i<progress?', đã hoàn thành':'')}>{i<progress?<Check size={13}/>:i+1}</span>)}</div></details>
 </section>
 </div>
 {error&&<div className="notice" role="alert">{error}<button className="button secondary" onClick={load}><RefreshCw size={16}/>Thử lại</button></div>}{notice&&<p className="attendance-notice" role="status"><Check size={16}/>{notice}</p>}
 <div className="attendance-rules"><span><Coins size={17}/><strong>{CHECKIN_DAILY} xu</strong> mỗi ngày</span><span><Gift size={17}/><strong>+{CHECKIN_WEEKLY} xu</strong> mỗi tuần</span><span><Flame size={17}/><strong>{CHECKIN_TOTAL} xu</strong> trọn hành trình</span></div>
 <p className="attendance-footnote">Bỏ lỡ một ngày, chuỗi sẽ bắt đầu lại; xu đã nhận vẫn được giữ. Sau ngày 49, mình bắt đầu hành trình mới.</p>
 </div>;
}
