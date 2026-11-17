"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,BookOpen,CheckCircle2,Crown,EyeOff,Gift,Info,Loader2,Medal,RefreshCw,ShieldCheck,Sun,Trophy,Users} from "lucide-react";
import {api} from "@/lib/client-api";
import {Title} from "./ui";
type Entry={rank:number;nickname:string;earned:number;isMe:boolean};
type Board={top:Entry[];me:{joined:boolean;nickname:string;rank:number|null;earned:number};participants:number};
const medal=["🥇","🥈","🥉"];
const points=(n:number)=>n.toLocaleString("vi-VN");
export function LeaderboardView({demo,onNavigate}:{demo:boolean;onNavigate?:(target:string)=>void}){
 const [data,setData]=useState<Board|null>(null);
 const [nickname,setNickname]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(!demo),[error,setError]=useState("");
 const reload=useCallback(async()=>{setLoading(true);setError("");
  try{const next=await api<Board>("/leaderboard");setData(next);setNickname(next.me.nickname);}
  catch(e){setError(e instanceof Error?e.message:"Không tải được bảng xếp hạng.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{if(!demo)void reload();},[demo,reload]);
 async function save(visible:boolean){
  if(busy)return;setBusy(true);setError("");
  try{
   const result=await api<Board>("/leaderboard",{method:"PATCH",body:JSON.stringify(visible?{visible:true,nickname:nickname.trim()}:{visible:false})});
   setData(result);setNickname(result.me.nickname);
  }catch(e){setError(e instanceof Error?e.message:"Không thể thay đổi hiển thị.");}
  finally{setBusy(false);}
 }
 const firstThree=[1,2,3].map(rank=>data?.top.find(x=>x.rank===rank)??null);
 return <div className="new-task leaderboard-task">
  <Title eyebrow="ĐIỂM NẮNG · GHI NHẬN NỖ LỰC" title="Top 10 Điểm Nắng" description="Nơi ghi nhận những bạn tích lũy Điểm Nắng nhiều nhất. Mỗi lần học tập là một bước tiến của riêng em.">
   {!demo&&<button className="button secondary leaderboard-refresh" onClick={()=>void reload()} disabled={loading||busy}><RefreshCw size={16}/>Cập nhật</button>}
  </Title>
  <div className="leaderboard-intro">
   <div className="leaderboard-intro-copy">
    <span className="leaderboard-eyebrow"><Sun size={16}/> BẢNG VINH DANH CỘNG ĐỒNG</span>
    <h2>Mỗi Điểm Nắng, một hành trình đáng tự hào.</h2>
    <p>Xếp hạng theo <strong>tổng điểm đã kiếm được</strong> từ các hoạt động hợp lệ. Dùng điểm đổi pet hoặc huy hiệu sẽ không làm giảm thứ hạng.</p>
    {!demo&&data&&<div className="leaderboard-pill"><Users size={15}/>{data.participants} bạn đang tham gia</div>}
   </div>
   <div className="leaderboard-symbol" aria-hidden="true"><span className="leaderboard-symbol-spark leaderboard-symbol-spark-one">✦</span><span className="leaderboard-symbol-spark leaderboard-symbol-spark-two">✦</span><span className="leaderboard-symbol-medal"><Trophy size={34} strokeWidth={1.85}/></span><strong>TOP 10</strong><small>ĐIỂM NẮNG</small></div>
  </div>
  {demo?<div className="panel leaderboard-empty"><Trophy size={39}/><h2>Bảng xếp hạng của người học thật</h2><p>Bản trải nghiệm không sử dụng tên hoặc điểm của tài khoản thật. Đăng nhập để xem Top 10 và lựa chọn tham gia bằng biệt danh riêng.</p><Link className="button primary" href="/login">Đăng nhập khám phá <ArrowRight size={16}/></Link></div>:<>
   {error&&<div className="notice leaderboard-error" role="alert">{error}<button type="button" className="text-button" onClick={()=>void reload()}><RefreshCw size={15}/>Thử lại</button></div>}
   {loading&&!data?<div className="panel leaderboard-loading" role="status"><Loader2 size={24} className="spin"/>Đang tải bảng xếp hạng…</div>:data&&<>
    <div className="leaderboard-my-summary">
     <div className="leaderboard-me-icon"><Sun size={27}/></div>
     <div className="leaderboard-my-copy"><span>Điểm Nắng em đã kiếm</span><strong>{points(data.me.earned)} <small>điểm</small></strong></div>
     <div className="leaderboard-my-place"><span>Vị trí của em</span><strong>{data.me.rank===null?"Chưa tham gia":"#"+data.me.rank}</strong></div>
    </div>
    <section className="leaderboard-board" aria-labelledby="leaders-title">
     <div className="leaderboard-head"><div><span className="leaderboard-section-eyebrow">NHỮNG NGÔI SAO NỔI BẬT</span><h2 id="leaders-title">Bảng vinh danh</h2></div><span className="leaderboard-top-caption"><Trophy size={16}/>Top 10</span></div>
     {data.top.length?<><div className="leaderboard-podium">
      {[1,0,2].map((i)=>{
       const entry=firstThree[i];const rank=i+1;
       return <div key={rank} className={"leaderboard-podium-card "+(rank===1?"winner":"")} data-rank={rank}>
        <span className="leaderboard-medal" aria-label={"Hạng "+rank}>{medal[i]}</span>
        {entry?<><span className="leaderboard-user-avatar">{entry.nickname.trim().charAt(0).toLocaleUpperCase("vi-VN")}</span><strong className="leaderboard-user-name" title={entry.nickname}>{entry.nickname}{entry.isMe&&<em>· Em</em>}</strong><span className="leaderboard-user-points">{points(entry.earned)} <small>điểm</small></span></>:<><span className="leaderboard-user-avatar vacant">?</span><strong className="leaderboard-user-name">Chưa có bạn</strong><span className="leaderboard-user-points">—</span></>}
        <div className="leaderboard-place">#{rank}</div>
       </div>;
      })}
     </div>
     {data.top.length>3&&<ol className="leaderboard-ranks" start={4}>
      {data.top.slice(3).map(entry=><li key={entry.rank} className={"leaderboard-rank-row "+(entry.isMe?"current-user":"")}>
       <span className="leaderboard-rank-number">{String(entry.rank).padStart(2,"0")}</span>
       <span className="leaderboard-list-avatar">{entry.nickname.trim().charAt(0).toLocaleUpperCase("vi-VN")}</span>
       <span className="leaderboard-rank-name">{entry.nickname}{entry.isMe&&<small>Đây là em</small>}</span>
       <strong>{points(entry.earned)}<span> Điểm Nắng</span></strong>
      </li>)}
     </ol>}</>:<div className="leaderboard-no-entries"><Medal size={39}/><h3>Chưa có người tham gia</h3><p>Em có thể là một trong những bạn đầu tiên xuất hiện trên bảng vinh danh. Không cần có nhiều điểm mới được tham gia.</p></div>}
    </section>
    <section className="panel leaderboard-participation" aria-labelledby="leaderboard-privacy-title">
     <div className="leaderboard-participation-icon">{data.me.joined?<CheckCircle2 size={24}/>:<ShieldCheck size={24}/>}</div>
     <div className="leaderboard-participation-copy"><h2 id="leaderboard-privacy-title">{data.me.joined?"Em đang có tên trên bảng xếp hạng":"Em muốn xuất hiện trong Top 10?"}</h2><p>Hoàn toàn tự nguyện. Chỉ <strong>biệt danh và tổng Điểm Nắng</strong> được công khai. Email, ảnh cá nhân và lịch sử học tập vẫn riêng tư.</p>
      {data.me.joined?<div className="leaderboard-joined"><span><CheckCircle2 size={16}/>Biệt danh: {data.me.nickname}</span><button className="button secondary" type="button" disabled={busy} onClick={()=>void save(false)}><EyeOff size={16}/>Ẩn khỏi bảng</button></div>:
       <form className="leaderboard-join-form" onSubmit={e=>{e.preventDefault();void save(true);}}>
        <label htmlFor="leaderboard-nickname">Biệt danh hiển thị</label>
        <div><input id="leaderboard-nickname" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Ví dụ: Mây Nhỏ" minLength={2} maxLength={24} required autoComplete="off" aria-describedby="leaderboard-nickname-hint"/><button type="submit" className="button primary" disabled={busy||nickname.trim().length<2}>{busy?<Loader2 size={17} className="spin"/>:<Crown size={17}/>}Tham gia</button></div>
        <small id="leaderboard-nickname-hint">2–24 ký tự. Không dùng tên đầy đủ, email hoặc thông tin riêng tư.</small>
       </form>}
     </div>
    </section>
   </>}
  </>}
  <section className="leaderboard-info" aria-label="Cách tính điểm"><div><Info size={19}/><span><strong>Cách tính:</strong> chỉ tính tổng Điểm Nắng đã nhận; không tính tiền thưởng hay giá trị vật chất. Nếu bằng điểm, thứ tự được xác định ổn định theo biệt danh.</span></div><div><Gift size={19}/><span>Đổi huy hiệu và pet không làm mất vị trí. Thứ hạng chỉ để khích lệ, không dùng để đánh giá học lực.</span></div></section>
  <div className="leaderboard-actions"><button type="button" className="button primary" onClick={()=>onNavigate?.("games")}><BookOpen size={17}/>Ôn tập kiếm điểm</button><button type="button" className="button secondary" onClick={()=>onNavigate?.("rewards")}><Trophy size={17}/>Góc thành tích</button></div>
 </div>;
}
