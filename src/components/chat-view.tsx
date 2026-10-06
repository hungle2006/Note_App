"use client";
import {useEffect,useRef,useState} from "react";
import {Sparkles,MessageCircle,Send,Loader2,BookOpen,ArrowUpRight,Lightbulb,GraduationCap,Target} from "lucide-react";
import type {Note} from "@/lib/schemas";
import type {TutorMessage,TutorMode} from "@/lib/tutor-context";
import {api} from "@/lib/client-api";
import {Title,Tag,Markdown} from "./ui";

export function ChatView({demo,note,notes,onSelect,onOpenSource}:{demo:boolean;note:Note|null;notes:Note[];onSelect:(id:string)=>void;onOpenSource:(id:string)=>void}){
 const [messages,setMessages]=useState<TutorMessage[]>([]);
 const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");const [grade,setGrade]=useState(6);const [mode,setMode]=useState<TutorMode>("explain");
 const version=useRef(0);const end=useRef<HTMLDivElement>(null);
 const activeGrade=note?.grade||grade;
 useEffect(()=>{
  const v=++version.current;setMessages([]);setError("");setBusy(false);
  if(demo){setLoading(false);return;}
  setLoading(true);
  api<{messages:TutorMessage[]}>("/chat?grade="+activeGrade+(note?"&noteId="+note.id:"")).then(r=>{if(v===version.current)setMessages(r.messages);}).catch(e=>{if(v===version.current)setError(e.message);}).finally(()=>{if(v===version.current)setLoading(false);});
 },[demo,note?.id,activeGrade]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,busy]);
 async function send(e?:React.FormEvent,question?:string){
  e?.preventDefault();const text=(question||input).trim();if(!text||busy||loading)return;
  if(demo){setError("Gia sư thật cần Mistral và tài khoản đã xác minh. Đây là giao diện mẫu; chưa có câu hỏi nào được gửi.");return;}
  const v=version.current;setBusy(true);setError("");
  try{const r=await api<{messages:TutorMessage[]}>("/chat",{method:"POST",body:JSON.stringify({message:text,noteId:note?.id,grade:activeGrade,mode})});if(v===version.current){setMessages(r.messages);setInput("");}}
  catch(e){if(v===version.current)setError(e instanceof Error?e.message:"Chưa gửi được câu hỏi.");}
  finally{if(v===version.current)setBusy(false);}
 }
 const modes=[{id:"explain" as const,label:"Hiểu bài",icon:Lightbulb},{id:"hint" as const,label:"Gợi ý từng bước",icon:GraduationCap},{id:"practice" as const,label:"Luyện cùng mình",icon:Target}];
 return <><Title eyebrow="MỖI CÂU HỎI LÀ MỘT BƯỚC TIẾN" title="Gia sư AI của em" description="Không hiểu ngay cũng không sao. Mình cùng tìm ra nhé."/>
 <div className="chat-layout"><div className="panel chat-panel"><div className="chat-header"><span className="ai-avatar"><Sparkles size={23}/></span><div><strong>NoteLab Tutor</strong><span>{demo?"Giao diện mẫu":"Gia sư Mistral"} · Lớp {activeGrade}</span></div><Tag color="green">{note?"THEO BÀI HỌC":"TÌM TRONG THƯ VIỆN"}</Tag></div>
 <div className="tutor-modes" aria-label="Cách học cùng gia sư">{modes.map(m=><button type="button" key={m.id} className={mode===m.id?"active":""} aria-pressed={mode===m.id} disabled={busy} onClick={()=>setMode(m.id)}><m.icon size={16}/>{m.label}</button>)}</div>
 <div className="chat-messages" aria-live="polite">{!messages.length&&<div className="chat-welcome"><span className="tutor-orb"><Sparkles size={35}/></span><span className="eyebrow">CHÀO EM, MÌNH LÀ NOTELAB TUTOR</span><h2>Điều gì đang làm em tò mò?</h2><p>{note?<>Mình cùng khám phá <strong>{note.title}</strong>. Em muốn hiểu công thức, xem ví dụ hay thử làm bài?</>:"Mình tìm kiến thức liên quan trong các bài em đã lưu. Em có thể chọn một bài cụ thể hoặc hỏi về thư viện."}</p><div className="chat-prompts">{["Giải thích ý chính bằng ngôn ngữ dễ hiểu","Gợi ý từng bước, để em tự tìm đáp án","Đặt một câu hỏi kiểm tra em đã hiểu bài"].map(q=><button disabled={busy||loading} key={q} onClick={()=>send(undefined,q)}><MessageCircle size={16}/>{q}<ArrowUpRight size={15}/></button>)}</div></div>}
 {messages.map((m,i)=><div className={"message "+m.role} key={i}>{m.role==="assistant"&&<span className="message-avatar"><Sparkles size={17}/></span>}<div>{m.role==="assistant"?<><Markdown content={m.content}/>{!!m.sources?.length&&<div className="tutor-sources"><span><BookOpen size={14}/>Bài học làm ngữ cảnh</span>{m.sources.map(s=><button key={s.noteId} onClick={()=>onOpenSource(s.noteId)}><b>[{s.reference}]</b><div><strong>{s.title}</strong><small>Lớp {s.grade} · {s.subject}</small></div><ArrowUpRight size={15}/></button>)}</div>}</>:<p>{m.content}</p>}</div></div>)}
 {(busy||loading)&&<div className="chat-thinking"><Loader2 className="spin" size={17}/>{busy?"Đang tìm kiến thức và soạn câu trả lời…":"Đang mở cuộc trò chuyện…"}</div>}<div ref={end}/></div>
 {error&&<p className="form-error chat-error" role="alert">{error}</p>}
 <form className="chat-input" onSubmit={send}><label className="sr-only" htmlFor="chat-message">Câu hỏi học tập</label><textarea id="chat-message" rows={2} value={input} maxLength={3000} disabled={busy||loading} placeholder="Em muốn hiểu thêm về…" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button className="send-button" disabled={busy||loading||!input.trim()} aria-label="Gửi câu hỏi"><Send size={19}/></button></form><div className="chat-disclaimer">AI có thể nhầm. Em hãy đối chiếu với vở và hỏi thầy cô khi cần.</div></div>
 <aside className="panel chat-context"><span className="eyebrow">NGUỒN HỌC CỦA EM</span><h3><BookOpen size={20}/>Bắt đầu từ kiến thức</h3><label>Em đang học lớp<select disabled={busy||!!note} value={activeGrade} onChange={e=>setGrade(Number(e.target.value))}>{[6,7,8,9].map(g=><option value={g} key={g}>Lớp {g}</option>)}</select></label><label>Bài học<select disabled={busy} value={note?.id||""} onChange={e=>onSelect(e.target.value)}><option value="">Tìm trong thư viện của em</option>{notes.map(n=><option key={n.id} value={n.id}>Lớp {n.grade} · {n.title}</option>)}</select></label>
 {note?<div className="context-note"><Tag>{note.subject}</Tag><h4>{note.title}</h4><span>Lớp {note.grade} · {note.chapter}</span><p>{note.summary}</p></div>:<div className="retrieval-note"><span className="retrieval-icon"><Sparkles size={22}/></span><strong>Gia sư hiểu những gì em đã lưu</strong><p>Mỗi câu hỏi được tìm trong bài học lớp {activeGrade} của em. Nếu chưa có nguồn phù hợp, gia sư sẽ nói rõ.</p></div>}
 <p className="context-tip"><Lightbulb size={20}/>Thử hỏi “Vì sao?”, “Khi nào dùng?” hoặc “Gợi ý để em tự làm”.</p></aside></div></>;
}
