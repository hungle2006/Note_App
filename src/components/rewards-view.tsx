"use client";
import {useState} from "react";
import {ArrowRight,ArrowUpRight,BookOpen,Check,Gift,Heart,Loader2,ShieldCheck,Sun,Trophy,Dumbbell} from "lucide-react";
import type {Learning} from "@/lib/use-learning";
import {petCatalog} from "@/lib/pets";
import {rewardCatalog,tierProgress} from "@/lib/rewards";
import {PetShop} from "./pet-habitat";
import {Title,formatDate} from "./ui";

type Filter="all"|"available"|"owned";
export function RewardsView({learning,demo,onNavigate}:{learning:Learning;demo:boolean;onNavigate?:(target:string)=>void}){
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [filter,setFilter]=useState<Filter>("all");
 const wallet=learning.wallet;
 const tier=tierProgress(wallet.earned);
 const ownedCount=wallet.redeemed.filter(r=>rewardCatalog.some(c=>c.id===r.rewardId)).length;
 const ownedPetCount=wallet.redeemed.filter(r=>petCatalog.some(p=>p.id===r.rewardId)).length;
 const catalog=rewardCatalog.filter(item=>{
  const owned=wallet.redeemed.some(r=>r.rewardId===item.id);
  return filter==="all"||(filter==="owned"?owned:!owned&&wallet.balance>=item.cost);
 });
 async function claim(id:string){
  setBusy(id);setError("");
  try{await learning.claimReward(id);}
  catch(e){setError(e instanceof Error?e.message:"Chưa đổi được huy hiệu. Hãy thử lại.");}
  finally{setBusy("");}
 }
 return <div className="sun-page">
  <Title eyebrow="SÂN CHƠI THÀNH TÍCH · KHÔNG CẦN SO SÁNH VỚI AI" title="Góc thành tích" description="Quiz, ghép đôi và buổi tập AI đủ điều kiện góp thêm Điểm Nắng cho em. Dùng điểm để sưu tầm huy hiệu hoặc đón pet, rồi chọn những bạn nhỏ đồng hành."/>
  <ol className="sun-reward-path" aria-label="Hành trình Điểm Nắng"><li><b>01</b><span>Ôn tập & vận động<small>Quiz, ghép đôi hoặc tập AI đủ điều kiện</small></span></li><li><b>02</b><span>Tích Điểm Nắng<small>Ghi nhận từng bước tiến của em</small></span></li><li><b>03</b><span>Huy hiệu hoặc pet<small>Chọn cách ghi nhận em yêu thích</small></span></li><li><b>04</b><span>Thêm bạn đồng hành<small>Tối đa 3 pet cùng xuất hiện</small></span></li></ol>
  <nav className="sun-section-nav" aria-label="Khám phá Góc thành tích"><a href="#pet-shop">Đón pet đồng hành</a><a href="#rewards-collection">Sưu tầm huy hiệu</a><a href="#points-history">Nhật ký điểm</a></nav>
  <div className="sun-hero">
   <section className="sun-balance" aria-label="Số Điểm Nắng">
    <span className="sun-kicker"><Sun size={15}/> VÍ ĐIỂM NẮNG CỦA EM</span>
    <h2>{wallet.balance.toLocaleString("vi-VN")}<small>Điểm Nắng ☀️</small></h2>
    <p>Em đã tích lũy <strong>{wallet.earned} điểm</strong>, sở hữu <strong>{ownedCount}/{rewardCatalog.length} huy hiệu</strong> và <strong>{ownedPetCount}/{petCatalog.length} pet</strong>. Điểm dùng để mở khóa sẽ trừ vào ví; cấp độ vẫn dựa trên tổng điểm từng nhận.</p>
    <div className="sun-actions">
     <button className="button primary" onClick={()=>onNavigate?.("games")}><BookOpen size={15}/> Ôn tập nhận điểm</button>
     <button className="button secondary" onClick={()=>onNavigate?.("fitness")}><Dumbbell size={15}/> Vận động cùng AI</button>
    </div>
   </section>
   <section className="sun-tier" aria-label="Cấp độ khám phá">
    <span className="sun-tier-kicker">Hành trình của chính em</span>
    <div className="sun-tier-name"><span className="sun-tier-emoji" aria-hidden="true">{tier.current.icon}</span><div><strong>{tier.current.label}</strong><small>Cấp độ dựa trên tổng điểm đã từng nhận</small></div></div>
    <div className="sun-track" role="progressbar" aria-valuenow={tier.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ lên cấp"><span style={{width:tier.progress+"%"}}/></div>
    <p className="sun-tier-next">{tier.next?<><span>Còn <b>{tier.remaining}</b> điểm để lên cấp</span><strong>{tier.next.label}</strong></>:<span>Em đã mở tất cả các cấp hiện tại. Cứ tận hưởng việc học nhé!</span>}</p>
   </section>
  </div>
  <p className="sun-rule"><ShieldCheck size={19}/><span><strong>Quy đổi minh bạch:</strong> Quiz/ghép đôi được 2 Điểm Nắng mỗi đáp án đúng, tối đa một lượt thưởng cho mỗi bài và trò/ngày. Vận động từ 30 giây và ít nhất 4 lần hợp lệ được 4 điểm/bài, tối đa 2 bài khác nhau/ngày. Ngày tính theo UTC, đặt lại lúc 07:00 giờ Việt Nam. Không có điểm cho việc tập quá mức, không có bảng xếp hạng hay phần thưởng tiền mặt.</span></p>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {learning.walletError&&<p role="status" className="notice">{learning.walletError}</p>}
  <div className="sun-quests" aria-label="Hai cách nhận Điểm Nắng">
   <article className="sun-quest"><span className="sun-quest-icon"><BookOpen size={23}/></span><div><h3>Khám phá kiến thức</h3><p>Trả lời quiz hoặc ghép đôi để củng cố bài học. Không cần đạt điểm tối đa.</p><button onClick={()=>onNavigate?.("games")}>Mở sân chơi kiến thức <ArrowRight size={14}/></button></div></article>
   <article className="sun-quest"><span className="sun-quest-icon"><Heart size={23}/></span><div><h3>Vận động vừa sức</h3><p>Một bài tập nhẹ cũng đáng khen. Đủ điều kiện: +4 Điểm Nắng; giới hạn 8 điểm/ngày.</p><button onClick={()=>onNavigate?.("fitness")}>Tập với bộ khung AI <ArrowRight size={14}/></button></div></article>
  </div>
  <PetShop learning={learning} demo={demo}/>
  <section className="sun-collection" id="rewards-collection">
   <div className="sun-collection-head"><div><span className="sun-kicker">BỘ SƯU TẬP NHO NHỎ</span><h2>Một dấu mốc của riêng em</h2><p>Chọn huy hiệu để ghi nhận nỗ lực, hoặc dành điểm đón pet ở khu phía trên. Cả hai dùng chung ví Điểm Nắng.</p></div><div className="sun-filters" role="group" aria-label="Lọc huy hiệu">
    <button aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>Tất cả ({rewardCatalog.length})</button>
    <button aria-pressed={filter==="available"} onClick={()=>setFilter("available")}>Có thể đổi</button>
    <button aria-pressed={filter==="owned"} onClick={()=>setFilter("owned")}>Đã sở hữu ({ownedCount})</button>
   </div></div>
   {catalog.length?<div className="sun-reward-grid">{catalog.map(r=>{
    const owned=wallet.redeemed.some(x=>x.rewardId===r.id);
    const affordable=wallet.balance>=r.cost;
    return <article className={"sun-reward"+(owned?" owned":"")} key={r.id}>
     <span className="sun-reward-art" aria-hidden="true">{r.emoji}</span>
     <span className="sun-reward-meta">{owned?"✓ ĐÃ SỞ HỮU":r.theme.toUpperCase()}</span>
     <h3>{r.name}</h3><p>{r.description}</p>
     <div className="sun-reward-bottom"><strong><Sun size={13} style={{verticalAlign:"middle",marginRight:3}}/>{r.cost} điểm</strong>{owned?<span>Đã mở khóa</span>:affordable?<span>Sẵn sàng</span>:<span>Thiếu {r.cost-wallet.balance}</span>}</div>
     <button className={"button "+(owned?"secondary":"primary")} disabled={Boolean(busy)||owned||!affordable} onClick={()=>claim(r.id)}>
      {busy===r.id?<Loader2 className="spin" size={16}/>:owned?<Check size={16}/>:<Gift size={16}/>}
      {owned?"Huy hiệu của em":affordable?"Đổi huy hiệu":"Chưa đủ Điểm Nắng"}
     </button>
    </article>;
   })}</div>:<p className="sun-empty">Chưa có huy hiệu nào ở bộ lọc này. Em có thể chọn “Tất cả” để khám phá nhé.</p>}
  </section>
  <section className="sun-archive" id="points-history">
   <header><h2>Nhật ký Điểm Nắng</h2><span className="sun-kicker">{demo?"LƯU Ở THIẾT BỊ":"LƯU TRÊN TURSO"}</span></header>
   {wallet.history.length?<div>{wallet.history.slice(0,35).map(event=><div className="sun-log" key={event.id}><span className="sun-log-icon">{event.amount>0?<ArrowUpRight size={17}/>:<Gift size={17}/>}</span><div><strong>{event.label}</strong><small>{formatDate(event.createdAt)}</small></div><b>{event.amount>0?"+":""}{event.amount}</b></div>)}</div>:<p className="sun-empty"><Trophy size={18} style={{verticalAlign:"middle",marginRight:6}}/> Chưa có giao dịch. Bắt đầu bằng một lượt quiz, ghép đôi hoặc buổi tập AI đủ điều kiện; Điểm Nắng sẽ giúp em đón pet và sưu tầm huy hiệu.</p>}
  </section>
 </div>;
}
