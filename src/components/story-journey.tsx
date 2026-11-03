"use client";
import Link from "next/link";
import {ArrowRight,BookOpen,Camera,Compass,Dumbbell,Gamepad2,MessageCircle,ShieldCheck,Settings,Sparkles,Trophy} from "lucide-react";
import type {LucideIcon} from "lucide-react";

type Step={id:string;chapter:string;title:string;subtitle:string;nextLine:string;icon:LucideIcon;tone:string};
export const JOURNEY_STEPS:Step[]=[
 {id:"home",chapter:"01",title:"Bắt đầu tò mò",subtitle:"Mở cánh cửa khám phá những điều em thích.",nextLine:"Chụp một trang vở hay",icon:Compass,tone:"peach"},
 {id:"scan",chapter:"02",title:"Giữ lại điều hay",subtitle:"Chụp trang vở, soát chữ và lưu bài của em.",nextLine:"Xem lại bài đã lưu",icon:Camera,tone:"apricot"},
 {id:"library",chapter:"03",title:"Gom thành kho báu",subtitle:"Sắp xếp bài học thành thư viện dễ tìm.",nextLine:"Hỏi điều em chưa hiểu",icon:BookOpen,tone:"sage"},
 {id:"chat",chapter:"04",title:"Gỡ rối một ý",subtitle:"Hỏi gia sư AI và đối chiếu với bài gốc.",nextLine:"Thử sức cùng trò chơi",icon:MessageCircle,tone:"sand"},
 {id:"games",chapter:"05",title:"Chơi để nhớ lâu",subtitle:"Lật thẻ, làm quiz, ghép những ý tưởng.",nextLine:"Nạp năng lượng cùng em",icon:Gamepad2,tone:"peach"},
 {id:"fitness",chapter:"06",title:"Nạp năng lượng",subtitle:"Chọn vận động vừa sức, tập và nghỉ theo nhịp riêng.",nextLine:"Đổi điểm, đón bạn nhỏ",icon:Dumbbell,tone:"sage"},
 {id:"rewards",chapter:"07",title:"Ghi nhận và đồng hành",subtitle:"Tích Điểm Nắng, đổi huy hiệu hoặc đón pet; chọn tối đa 3 bạn cùng học.",nextLine:"Bắt đầu một hành trình mới",icon:Trophy,tone:"apricot"}
];
export function StoryRoadmap({onNavigate,compact=false}:{onNavigate?:(id:string)=>void;compact?:boolean}){
 return <section className={"story-roadmap"+(compact?" compact":"")} aria-label="Hành trình SmartNotes gồm 7 chặng">
  <header className="story-roadmap-head">
   <div><span className="story-eyebrow"><Sparkles size={14}/> MỘT HÀNH TRÌNH · BẢY GÓC KHÁM PHÁ</span>
    <h2>Từ điều tò mò đến điều em làm được.</h2>
    <p>Không cần đi theo thứ tự. Chọn chặng phù hợp với mình hôm nay.</p>
   </div><span className="story-path-symbol" aria-hidden="true"><Compass size={24}/></span>
  </header>
  <div className="story-steps">
   {JOURNEY_STEPS.map(step=>{
     const Icon=step.icon;
     const content=<><span className="story-step-icon"><Icon size={20} strokeWidth={2}/></span>
      <span className="story-step-number">CHẶNG {step.chapter}</span>
      <strong>{step.title}</strong><small>{step.subtitle}</small>
      <span className="story-step-arrow"><ArrowRight size={15}/></span></>;
     return onNavigate?<button key={step.id} type="button" className={"story-step tone-"+step.tone} onClick={()=>onNavigate(step.id)}>{content}</button>
      :<Link key={step.id} className={"story-step tone-"+step.tone} href={"/app?mode=demo&view="+step.id}>{content}</Link>;
   })}
  </div>
 </section>;
}

export function StoryChapter({view,onNavigate}:{view:string;onNavigate:(id:string)=>void}){
 const normalized=view==="detail"?"library":view;
 const selected=JOURNEY_STEPS.find(s=>s.id===normalized);
 const side=view==="quality"?{title:"Kiểm chứng để hiểu đúng",subtitle:"Xem lại kết quả nhận diện chữ và những chỗ cần soát.",icon:ShieldCheck}:
 view==="settings"?{title:"Không gian học tập của em",subtitle:"Quản lý thông tin và kết nối một cách rõ ràng.",icon:Settings}:null;
 if(!selected&&!side)return null;
 const chapterIndex=selected?JOURNEY_STEPS.indexOf(selected):-1;
 const next=selected?JOURNEY_STEPS[(chapterIndex+1)%JOURNEY_STEPS.length]:null;
 const Icon=selected?.icon??side!.icon;
 const title=selected?.title??side!.title;
 const subtitle=selected?.subtitle??side!.subtitle;
 return <section className={"story-chapter tone-"+(selected?.tone??"sage")} aria-label={"Chương hành trình: "+title}>
  <div className="story-chapter-icon"><Icon size={22} strokeWidth={2}/></div>
  <div className="story-chapter-copy">
   <span className="story-chapter-caption">{selected?"CHẶNG "+selected.chapter+" / 07":"GÓC RIÊNG CỦA EM"}</span>
   <strong>{title}</strong>
   <small>{subtitle}</small>
  </div>
  {next&&<button type="button" className="story-next" onClick={()=>onNavigate(next.id)} aria-label={"Đi tới chặng tiếp theo: "+next.title}>
   <span className="story-next-caption">CHẶNG TIẾP</span><span>{next.title}<ArrowRight size={16}/></span>
  </button>}
 </section>;
}
