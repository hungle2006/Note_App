"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,BookOpen,Check,ChevronDown,ChevronUp,Clock3,Flame,Heart,HelpCircle,Loader2,MessageCircle,MoreHorizontal,PenLine,RefreshCw,Search,Send,ShieldCheck,Trash2,Users,Flag,X} from "lucide-react";
import {api} from "@/lib/client-api";

type Subject="Toán"|"Ngữ văn"|"Tiếng Anh"|"Khoa học"|"Lịch sử - Địa lí"|"Kỹ năng học tập"|"Khác";
const subjects:Subject[]=["Toán","Ngữ văn","Tiếng Anh","Khoa học","Lịch sử - Địa lí","Kỹ năng học tập","Khác"];
type Post={id:string;nickname:string;subject:string;title:string;body:string;createdAt:string;comments:number;likes:number;liked:boolean;mine:boolean};
type Comment={id:string;nickname:string;body:string;createdAt:string;mine:boolean};
type Feed={posts:Post[];nextOffset:number|null;total:number;today:number};
type Discussion={comments:Comment[];nextOffset:number|null};
const prettyTime=(time:string)=>{
 const ms=Date.now()-Date.parse(time);
 if(Number.isNaN(ms))return "";
 if(ms<60000)return "Vừa xong";
 if(ms<3600000)return Math.max(1,Math.floor(ms/60000))+" phút trước";
 if(ms<86400000)return Math.floor(ms/3600000)+" giờ trước";
 return new Date(time).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"});
};
const sendAction=<T,>(body:object)=>api<T>("/forum/action",{method:"POST",body:JSON.stringify(body)});

function PostCard({post,nickname,onUpdate,onDelete}:{post:Post;nickname:string;onUpdate:(change:Partial<Post>)=>void;onDelete:()=>void}){
 const [expanded,setExpanded]=useState(false),[comments,setComments]=useState<Comment[]>([]),[nextOffset,setNextOffset]=useState<number|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[body,setBody]=useState(""),[error,setError]=useState(""),[reported,setReported]=useState(false);
 const [options,setOptions]=useState(false);
 async function fetchComments(offset=0){
  setLoading(true);setError("");
  try{
   const response=await api<Discussion>("/forum/comments?postId="+encodeURIComponent(post.id)+"&offset="+offset);
   setComments(old=>offset===0?response.comments:[...old,...response.comments]);
   setNextOffset(response.nextOffset);
  }catch(e){setError(e instanceof Error?e.message:"Không tải được bình luận.");}
  finally{setLoading(false);}
 }
 async function toggleComments(){if(expanded){setExpanded(false);return;}setExpanded(true);await fetchComments(0);}
 async function like(){
  if(busy)return;setBusy(true);setError("");
  try{const r=await sendAction<{likes:number;liked:boolean}>({type:"like",postId:post.id,active:!post.liked});onUpdate(r);}
  catch(e){setError(e instanceof Error?e.message:"Không thể bày tỏ sự hữu ích.");}finally{setBusy(false);}
 }
 async function submitComment(e:React.FormEvent){
  e.preventDefault();if(busy||!body.trim())return;setBusy(true);setError("");
  try{
   const r=await sendAction<{comment:Comment}>({type:"comment",postId:post.id,nickname,body:body.trim()});
   setComments(old=>[...old,r.comment]);onUpdate({comments:post.comments+1});setBody("");
  }catch(e){setError(e instanceof Error?e.message:"Không gửi được bình luận.");}finally{setBusy(false);}
 }
 async function removeComment(id:string){
  if(!window.confirm("Xóa bình luận này?"))return;setBusy(true);
  try{await sendAction({type:"delete-comment",commentId:id});setComments(old=>old.filter(x=>x.id!==id));onUpdate({comments:Math.max(0,post.comments-1)});}
  catch(e){setError(e instanceof Error?e.message:"Không xóa được bình luận.");}finally{setBusy(false);}
 }
 async function report(commentId?:string){
  if(!window.confirm("Báo cáo nội dung không phù hợp để cộng đồng an toàn hơn?"))return;
  setBusy(true);setError("");try{
   await sendAction({type:"report",postId:post.id,...(commentId?{commentId}:{}),reason:"other"});
   setReported(true);setOptions(false);
  }catch(e){setError(e instanceof Error?e.message:"Chưa gửi được báo cáo.");}finally{setBusy(false);}
 }
 async function removePost(){
  if(!window.confirm("Xóa câu hỏi và ẩn các bình luận liên quan?"))return;
  setBusy(true);setError("");
  try{await sendAction({type:"delete-post",postId:post.id});onDelete();}
  catch(e){setError(e instanceof Error?e.message:"Không xóa được câu hỏi.");}finally{setBusy(false);}
 }
 return <article className="forum-post" aria-label={"Câu hỏi: "+post.title}>
  <div className="forum-post-head">
   <span className="forum-avatar" aria-hidden="true">{post.nickname.charAt(0).toLocaleUpperCase("vi-VN")}</span>
   <div className="forum-post-author"><strong>{post.nickname} {post.mine&&<small>· Bạn</small>}</strong><span><Clock3 size={12}/>{prettyTime(post.createdAt)} <span aria-hidden="true">·</span> <b>{post.subject}</b></span></div>
   <div className="forum-more">
    <button type="button" className="forum-icon" onClick={()=>setOptions(v=>!v)} aria-label="Tùy chọn câu hỏi" aria-expanded={options}><MoreHorizontal size={21}/></button>
    {options&&<div className="forum-menu">{post.mine?<button onClick={()=>{setOptions(false);void removePost();}}><Trash2 size={15}/>Xóa câu hỏi</button>:<button disabled={busy} onClick={()=>void report()}><Flag size={15}/>Báo cáo câu hỏi</button>}</div>}
   </div>
  </div>
  <div className="forum-post-body"><span className="forum-topic">{post.subject}</span><h3>{post.title}</h3><p>{post.body}</p></div>
  <div className="forum-post-counts"><span><Heart size={14}/> {post.likes} hữu ích</span><span>{post.comments} bình luận</span></div>
  <div className="forum-post-actions">
   <button type="button" aria-pressed={post.liked} className={post.liked?"is-liked":""} disabled={busy} onClick={()=>void like()}><Heart size={18} fill={post.liked?"currentColor":"none"}/> {post.liked?"Đã thấy hữu ích":"Hữu ích"}</button>
   <button type="button" aria-expanded={expanded} onClick={()=>void toggleComments()}><MessageCircle size={18}/> Bình luận {expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
  </div>
  {reported&&<p className="forum-inline-note" role="status"><Check size={15}/> Đã nhận báo cáo. Cảm ơn bạn đã giúp giữ diễn đàn an toàn.</p>}
  {error&&<p className="forum-error" role="alert">{error}</p>}
  {expanded&&<section className="forum-comments" aria-label={"Bình luận cho "+post.title}>
   {loading&&!comments.length?<div className="forum-loading"><Loader2 className="spin" size={17}/> Đang tải bình luận…</div>:!comments.length?<p className="forum-no-comments">Chưa có bình luận. Hãy chia sẻ lời giải hoặc một gợi ý!</p>:<div className="forum-comment-list">
    {comments.map(comment=><div key={comment.id} className="forum-comment">
     <span className="forum-avatar small" aria-hidden="true">{comment.nickname.charAt(0).toLocaleUpperCase("vi-VN")}</span>
     <div className="forum-comment-main"><div><strong>{comment.nickname}{comment.mine&&<small> · Bạn</small>}</strong><time>{prettyTime(comment.createdAt)}</time></div><p>{comment.body}</p>
      <div className="forum-comment-tools">{comment.mine?<button disabled={busy} onClick={()=>void removeComment(comment.id)}>Xóa</button>:<button disabled={busy} onClick={()=>void report(comment.id)}><Flag size={12}/>Báo cáo</button>}</div>
     </div>
    </div>)}
   </div>}
   {nextOffset!==null&&<button type="button" className="forum-more-comments" disabled={loading} onClick={()=>void fetchComments(nextOffset)}>{loading?"Đang tải…":"Xem thêm bình luận"}</button>}
   <form className="forum-comment-compose" onSubmit={submitComment}>
    <span className="forum-avatar small" aria-hidden="true">{nickname.charAt(0).toLocaleUpperCase("vi-VN")}</span>
    <label className="sr-only" htmlFor={"forum-reply-"+post.id}>Viết bình luận</label>
    <input id={"forum-reply-"+post.id} minLength={2} maxLength={1500} value={body} onChange={e=>setBody(e.target.value)} placeholder="Viết câu trả lời hoặc gợi ý…" required/>
    <button type="submit" className="forum-send" aria-label="Gửi bình luận" disabled={busy||body.trim().length<2}>{busy?<Loader2 size={18} className="spin"/>:<Send size={18}/>}</button>
   </form>
  </section>}
 </article>;
}

export function ForumView({demo,onNavigate}:{demo:boolean;onNavigate?:(view:string)=>void}){
 const [sort,setSort]=useState<"hot"|"new"|"mine">("hot"),[subject,setSubject]=useState(""),[search,setSearch]=useState(""),[q,setQ]=useState("");
 const [feed,setFeed]=useState<Feed>({posts:[],nextOffset:null,total:0,today:0});
 const [loading,setLoading]=useState(!demo),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState("");
 const [compose,setCompose]=useState(false),[busy,setBusy]=useState(false),[nickname,setNickname]=useState("Bạn học");
 const [postSubject,setPostSubject]=useState<Subject>("Toán"),[title,setTitle]=useState(""),[body,setBody]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{if(demo)return;try{const stored=window.localStorage.getItem("noteapp-forum-nickname");if(stored&&stored.length>=2&&stored.length<=24)setNickname(stored);}catch{}},[demo]);
 const load=useCallback(async(offset=0)=>{
  if(demo)return;if(offset===0)setLoading(true);else setLoadingMore(true);
  setError("");
  try{
   const params=new URLSearchParams({sort,offset:String(offset)});
   if(subject)params.set("subject",subject);if(q.trim())params.set("q",q.trim());
   const result=await api<Feed>("/forum?"+params.toString());
   setFeed(prev=>offset===0?result:{...result,posts:[...prev.posts,...result.posts]});
  }catch(e){setError(e instanceof Error?e.message:"Chưa tải được bảng tin. Vui lòng thử lại.");}
  finally{setLoading(false);setLoadingMore(false);}
 },[sort,subject,q,demo]);
 useEffect(()=>{void load(0);},[load]);
 async function publish(e:React.FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
  try{
   await api("/forum",{method:"POST",body:JSON.stringify({nickname:nickname.trim(),subject:postSubject,title:title.trim(),body:body.trim()})});
   try{window.localStorage.setItem("noteapp-forum-nickname",nickname.trim());}catch{}
   setTitle("");setBody("");setCompose(false);setNotice("Câu hỏi của bạn đã đăng lên diễn đàn.");
   if(sort!=="new"||subject||q){setSort("new");setSubject("");setQ("");setSearch("");}
   else await load(0);
  }catch(e){setError(e instanceof Error?e.message:"Chưa đăng được câu hỏi.");}finally{setBusy(false);}
 }
 function changePost(id:string,part:Partial<Post>){setFeed(prev=>({...prev,posts:prev.posts.map(p=>p.id===id?{...p,...part}:p)}));}
 function removePost(id:string){setFeed(prev=>({...prev,posts:prev.posts.filter(p=>p.id!==id),total:Math.max(0,prev.total-1)}));setNotice("Đã xóa câu hỏi của bạn.");}
 return <div className="forum-page">
  <section className="forum-hero">
   <div className="forum-hero-copy"><span className="forum-hero-eyebrow"><Flame size={16}/> DIỄN ĐÀN HỌC TẬP</span><h1>Câu hỏi hot <em>hôm nay</em></h1><p>Có điều gì chưa hiểu? Đặt câu hỏi và cùng bạn bè gỡ rối. Mỗi lời góp ý đều có thể giúp một người khác tiến bộ.</p>
    <div className="forum-hero-actions"><button type="button" className="forum-primary" onClick={()=>setCompose(v=>!v)} disabled={demo}><PenLine size={17}/>{compose?"Đóng khung đăng bài":"Đặt câu hỏi mới"}</button><span><Users size={15}/> Cùng học, cùng trả lời</span></div>
   </div>
   <div className="forum-hero-art" aria-hidden="true"><span className="forum-hero-bubble one"><HelpCircle size={30}/></span><span className="forum-hero-bubble two"><MessageCircle size={34}/></span><span className="forum-hero-bubble three">✦</span></div>
  </section>
  {demo?<div className="forum-demo"><ShieldCheck size={29}/><h2>Hãy đăng nhập để trò chuyện với cộng đồng</h2><p>Chỉ tài khoản đã xác minh mới xem, đăng câu hỏi và bình luận. Không có bài đăng hoặc người dùng giả trong bản mẫu.</p><Link href="/login" className="forum-primary">Đăng nhập <ArrowRight size={16}/></Link></div>:<>
   {compose&&<form className="forum-composer" onSubmit={publish} aria-label="Đăng câu hỏi mới">
    <div className="forum-composer-title"><div><span className="forum-avatar"><PenLine size={21}/></span><div><h2>Bạn muốn hỏi điều gì?</h2><p>Diễn đạt rõ đề bài để mọi người dễ giúp bạn nhé.</p></div></div><button type="button" aria-label="Đóng khung đăng bài" className="forum-icon" onClick={()=>setCompose(false)}><X size={19}/></button></div>
    <div className="forum-compose-grid"><label>Biệt danh công khai<input value={nickname} onChange={e=>setNickname(e.target.value)} minLength={2} maxLength={24} autoComplete="off" required placeholder="Ví dụ: Mây Nhỏ"/></label>
     <label>Môn / chủ đề<select value={postSubject} onChange={e=>setPostSubject(e.target.value as Subject)}>{subjects.map(s=><option key={s} value={s}>{s}</option>)}</select></label></div>
    <label>Tiêu đề câu hỏi<input value={title} onChange={e=>setTitle(e.target.value)} minLength={8} maxLength={160} required placeholder="Ví dụ: Vì sao hai phân số này bằng nhau?"/></label>
    <label>Chi tiết câu hỏi<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={15} maxLength={3000} required rows={4} placeholder="Viết đề bài, những gì bạn đã thử và phần chưa hiểu…"/></label>
    <div className="forum-composer-footer"><p><ShieldCheck size={16}/> Chỉ biệt danh và nội dung đăng được hiển thị. Không chia sẻ thông tin cá nhân, đường dẫn hoặc số điện thoại.</p><button type="submit" className="forum-primary" disabled={busy||title.trim().length<8||body.trim().length<15||nickname.trim().length<2}>{busy?<Loader2 size={16} className="spin"/>:<Send size={16}/>} Đăng câu hỏi</button></div>
   </form>}
   {notice&&<p className="forum-success" role="status"><Check size={17}/>{notice}<button aria-label="Đóng thông báo" onClick={()=>setNotice("")}><X size={14}/></button></p>}
   {error&&<p className="forum-error forum-global-error" role="alert">{error}<button type="button" onClick={()=>void load(0)}><RefreshCw size={15}/>Thử lại</button></p>}
   <div className="forum-layout"><div className="forum-main">
    <section className="forum-toolbar" aria-label="Lọc bảng tin">
     <div className="forum-tabs" role="group" aria-label="Chọn bảng tin">
      {[{id:"hot",label:"Hot hôm nay",icon:Flame},{id:"new",label:"Mới nhất",icon:Clock3},{id:"mine",label:"Của tôi",icon:PenLine}].map(t=><button type="button" key={t.id} className={sort===t.id?"active":""} onClick={()=>setSort(t.id as "hot"|"new"|"mine")} aria-pressed={sort===t.id}><t.icon size={16}/>{t.label}</button>)}
     </div>
     <div className="forum-filters"><label className="sr-only" htmlFor="forum-subject-filter">Lọc môn học</label><select id="forum-subject-filter" value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Tất cả môn</option>{subjects.map(s=><option key={s} value={s}>{s}</option>)}</select>
      <form role="search" onSubmit={e=>{e.preventDefault();setQ(search.trim());}}><label className="sr-only" htmlFor="forum-search">Tìm câu hỏi</label><Search size={16}/><input id="forum-search" value={search} onChange={e=>setSearch(e.target.value)} maxLength={80} placeholder="Tìm câu hỏi…"/><button type="submit" aria-label="Tìm kiếm"><ArrowRight size={17}/></button></form></div>
    </section>
    <div className="forum-feed-title"><h2>{sort==="hot"?"Đang được quan tâm":sort==="mine"?"Câu hỏi của bạn":"Bảng tin mới nhất"}</h2><button type="button" onClick={()=>void load(0)} disabled={loading} aria-label="Làm mới bảng tin"><RefreshCw size={17} className={loading?"spin":""}/></button></div>
    {loading?<div className="forum-loading-panel"><Loader2 size={25} className="spin"/><span>Đang tải câu hỏi của mọi người…</span></div>:feed.posts.length===0?<div className="forum-empty"><span className="forum-empty-icon"><HelpCircle size={35}/></span><h3>{sort==="hot"?"Hôm nay chưa có câu hỏi nổi bật":sort==="mine"?"Bạn chưa đăng câu hỏi nào":"Chưa tìm thấy câu hỏi phù hợp"}</h3><p>Hãy là người mở đầu một cuộc thảo luận hữu ích, hoặc khám phá những câu hỏi mới.</p><div><button type="button" className="forum-primary" onClick={()=>setCompose(true)}><PenLine size={16}/>Đặt câu hỏi</button>{sort==="hot"&&<button type="button" className="forum-secondary" onClick={()=>setSort("new")}>Xem mới nhất</button>}</div></div>:<div className="forum-feed">
     {feed.posts.map(p=><PostCard key={p.id} post={p} nickname={nickname} onUpdate={part=>changePost(p.id,part)} onDelete={()=>removePost(p.id)}/>)}
     {feed.nextOffset!==null&&<button type="button" className="forum-load-more" disabled={loadingMore} onClick={()=>void load(feed.nextOffset!)}>{loadingMore?<Loader2 size={17} className="spin"/>:<ChevronDown size={18}/>} Xem thêm câu hỏi</button>}
    </div>}
   </div>
   <aside className="forum-sidebar">
    <div className="forum-side-card forum-side-welcome"><span className="forum-side-icon"><Flame size={20}/></span><span className="forum-side-caption">HÔM NAY TRÊN DIỄN ĐÀN</span><strong>{feed.today.toLocaleString("vi-VN")}</strong><p>câu hỏi được chia sẻ hôm nay</p><span className="forum-side-foot">{feed.total.toLocaleString("vi-VN")} câu hỏi trong cộng đồng</span></div>
    <div className="forum-side-card"><h3><ShieldCheck size={18}/> Góc trao đổi văn minh</h3><p>Hỏi rõ ràng, bình luận tử tế và góp ý dựa trên kiến thức. Không đăng số điện thoại, địa chỉ, email hoặc dữ liệu riêng tư.</p><p>Thấy nội dung không phù hợp? Chọn <strong>Báo cáo</strong> để giúp bảo vệ mọi người.</p></div>
    <div className="forum-side-card"><h3><BookOpen size={18}/> Cùng học tốt hơn</h3><p>Ghé thư viện và gia sư AI để tìm thêm gợi ý trước khi trả lời.</p><button type="button" className="forum-side-link" onClick={()=>onNavigate?.("library")}>Mở thư viện <ArrowRight size={15}/></button></div>
   </aside>
   </div>
  </>}
 </div>;
}
