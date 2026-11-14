"use client";
import {SmartSelect} from "./smart-select";
import {useEffect,useRef,useState} from "react";
import {Sparkles,MessageCircle,Send,Loader2,BookOpen,ArrowUpRight,Lightbulb,GraduationCap,Target,Plus,Trash2,History,ChevronDown,Settings2,X} from "lucide-react";
import type {Note} from "@/lib/schemas";
import type {TutorMessage,TutorMode,TutorThread,TutorThreadSummary} from "@/lib/tutor-context";
import {api} from "@/lib/client-api";
import {Title,Tag,Markdown} from "./ui";

export function ChatView({demo,note,notes,onSelect,onOpenSource}:{demo:boolean;note:Note|null;notes:Note[];onSelect:(id:string)=>void;onOpenSource:(id:string)=>void}){
 const [messages,setMessages]=useState<TutorMessage[]>([]);
 const [threads,setThreads]=useState<TutorThreadSummary[]>([]);
 const [threadId,setThreadId]=useState<string|null>(null);
 const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
 const [historyOpen,setHistoryOpen]=useState(false);
 const [contextOpen,setContextOpen]=useState(false);
 const viewportRef=useRef<HTMLDivElement>(null),stickToBottom=useRef(true);
 const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");const [grade,setGrade]=useState(6);const [mode,setMode]=useState<TutorMode>("explain");
 const inputRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const field=inputRef.current;if(!field)return;field.style.height="0px";field.style.height=Math.min(120,Math.max(44,field.scrollHeight))+"px";},[input]);
 const version=useRef(0);
 const activeGrade=note?.grade||grade;
 useEffect(()=>{
  const v=++version.current;setThreadId(null);setThreads([]);setMessages([]);setError("");setBusy(false);setConfirmDelete(null);
  if(demo){setLoading(false);return;}
  setLoading(true);
  const query="/chat/threads?grade="+activeGrade+(note?"&noteId="+encodeURIComponent(note.id):"");
  api<{threads:TutorThreadSummary[]}>(query).then(async result=>{
   if(v!==version.current)return;
   setThreads(result.threads);
   if(result.threads.length){
    const found=await api<{thread:TutorThread}>("/chat/threads/"+result.threads[0].id);
    if(v===version.current){stickToBottom.current=true;setThreadId(found.thread.id);setMessages(found.thread.messages);}
   }
  }).catch(e=>{if(v===version.current)setError(e instanceof Error?e.message:"Không tải được lịch sử.");})
    .finally(()=>{if(v===version.current)setLoading(false);});
 },[demo,note?.id,activeGrade]);
 useEffect(()=>{const list=viewportRef.current;if(list&&stickToBottom.current)list.scrollTop=list.scrollHeight;},[messages,busy,loading]);
 useEffect(()=>{const shell=document.querySelector<HTMLElement>('.focused-workspace');if(!shell)return;const viewport=window.visualViewport;const update=()=>{shell.style.setProperty('--task-height',(viewport?.height||window.innerHeight)+'px');shell.style.setProperty('--task-top',(viewport?.offsetTop||0)+'px');const list=viewportRef.current;if(list&&stickToBottom.current)list.scrollTop=list.scrollHeight;};update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);shell.style.removeProperty('--task-height');shell.style.removeProperty('--task-top');};},[]);
 function newChat(){if(busy||loading)return;version.current++;stickToBottom.current=true;setThreadId(null);setMessages([]);setInput("");setHistoryOpen(false);setError("");setConfirmDelete(null);inputRef.current?.focus();}
 async function openThread(id:string){
  if(busy||loading||id===threadId)return;
  const v=++version.current;setLoading(true);setError("");setConfirmDelete(null);
  try{const result=await api<{thread:TutorThread}>("/chat/threads/"+id);
   if(v===version.current){stickToBottom.current=true;setThreadId(result.thread.id);setMessages(result.thread.messages);setInput("");setHistoryOpen(false);}
  }catch(e){if(v===version.current)setError(e instanceof Error?e.message:"Không mở được cuộc trò chuyện.");}
  finally{if(v===version.current)setLoading(false);}
 }
 async function removeThread(id:string){
  if(busy||loading)return;setLoading(true);setError("");
  try{
   await api("/chat/threads/"+id,{method:"DELETE"});
   setThreads(old=>old.filter(t=>t.id!==id));
   if(threadId===id){version.current++;stickToBottom.current=true;setThreadId(null);setMessages([]);setInput("");setHistoryOpen(false);}
   setConfirmDelete(null);
  }catch(e){setError(e instanceof Error?e.message:"Không xóa được cuộc trò chuyện.");}
  finally{setLoading(false);}
 }
 async function refreshThreads(){
  const result=await api<{threads:TutorThreadSummary[]}>("/chat/threads?grade="+activeGrade+(note?"&noteId="+encodeURIComponent(note.id):""));
  setThreads(result.threads);
 }
 async function send(e?:React.FormEvent,question?:string){
  e?.preventDefault();const text=(question||input).trim();if(!text||busy||loading)return;
  if(demo){setError("Gia sư thật cần Groq và tài khoản đã xác minh. Đây là giao diện mẫu; chưa có câu hỏi nào được gửi.");return;}
  const v=version.current;stickToBottom.current=true;setBusy(true);setError("");
  try{
   let id=threadId;
   if(!id){
    const created=await api<{thread:TutorThread}>("/chat/threads",{method:"POST",body:JSON.stringify({grade:activeGrade,...(note?{noteId:note.id}:{})})});
    id=created.thread.id;
    if(v===version.current)setThreadId(id);
   }
   const r=await api<{messages:TutorMessage[]}>("/chat",{method:"POST",body:JSON.stringify({message:text,threadId:id,mode,grade:activeGrade})});
   if(v===version.current){setMessages(r.messages);setInput("");await refreshThreads();}
  }catch(e){if(v===version.current)setError(e instanceof Error?e.message:"Chưa gửi được câu hỏi.");}
  finally{if(v===version.current)setBusy(false);}
 }
 const modes=[{id:"explain" as const,label:"Hiểu bài",icon:Lightbulb},{id:"hint" as const,label:"Gợi ý từng bước",icon:GraduationCap},{id:"practice" as const,label:"Luyện cùng mình",icon:Target}];
 return <><Title eyebrow="MỖI CÂU HỎI LÀ MỘT BƯỚC TIẾN" title="Gia sư AI của em" description="Không hiểu ngay cũng không sao. Mình cùng tìm ra nhé."/>
 <div className={'tutor-shell'+(historyOpen?' history-open':'')+(contextOpen?' context-open':'')}>
 <div className="tutor-workspace-tools"><button type="button" aria-expanded={historyOpen} onClick={()=>{setHistoryOpen(v=>!v);setContextOpen(false);}}><History size={18}/><span>Lịch sử</span></button><strong>Gia sư AI</strong><button type="button" aria-expanded={contextOpen} onClick={()=>{setContextOpen(v=>!v);setHistoryOpen(false);}}><Settings2 size={18}/><span>Nguồn học</span></button><button type="button" aria-label="Cuộc trò chuyện mới" onClick={newChat} disabled={busy||loading}><Plus size={20}/></button></div>
 <aside className="panel tutor-history" aria-label="Lịch sử trò chuyện">
  <div className="tutor-history-heading"><div><History size={17}/><strong>Cuộc trò chuyện</strong></div><button className="tutor-history-toggle" aria-label="Hiện hoặc ẩn lịch sử" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(o=>!o)}><ChevronDown size={19}/></button></div>
  <button type="button" className="tutor-new-chat" onClick={newChat} disabled={busy||loading}><Plus size={17}/> Cuộc trò chuyện mới</button>
  <div className={"tutor-history-list "+(historyOpen?"is-open":"")}>
   {threads.length===0&&<p className="tutor-history-empty">{demo?"Đăng nhập để lưu lịch sử trò chuyện.":"Chưa có lịch sử. Hãy bắt đầu một câu hỏi mới."}</p>}
   {threads.map(t=><div className={"tutor-thread "+(threadId===t.id?"active":"")} key={t.id}>
    <button type="button" className="tutor-thread-open" onClick={()=>openThread(t.id)} disabled={busy||loading} title={t.title} aria-current={threadId===t.id?"true":undefined}>
     <MessageCircle size={15}/><span><strong>{t.title}</strong><small>{new Date(t.updatedAt).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"})} · {t.messageCount} tin nhắn</small></span>
    </button>
    <button type="button" className="tutor-thread-delete" aria-label={"Xóa cuộc trò chuyện "+t.title} title="Xóa cuộc trò chuyện" disabled={busy||loading} onClick={()=>setConfirmDelete(t.id)}><Trash2 size={15}/></button>
   </div>)}
  </div>
  {confirmDelete&&<div className="tutor-delete-confirm" role="alertdialog" aria-label="Xác nhận xóa cuộc trò chuyện"><strong>Xóa cuộc trò chuyện?</strong><p>Nội dung đã xóa sẽ không thể khôi phục.</p><div><button type="button" disabled={loading} onClick={()=>setConfirmDelete(null)}>Hủy</button><button type="button" disabled={loading} onClick={()=>removeThread(confirmDelete)}>Xóa</button></div></div>}
 </aside>
 <div className="chat-layout"><div className="panel chat-panel"><div className="chat-header"><span className="ai-avatar"><Sparkles size={23}/></span><div><strong>SmartNotes AI Tutor</strong><span>{demo?"Giao diện mẫu":"Gia sư Groq"} · Lớp {activeGrade}</span></div><Tag color="green">{note?"THEO BÀI HỌC":"TÌM TRONG THƯ VIỆN"}</Tag></div>
 <div className="tutor-modes" aria-label="Cách học cùng gia sư">{modes.map(m=><button type="button" key={m.id} className={mode===m.id?"active":""} aria-pressed={mode===m.id} disabled={busy} onClick={()=>setMode(m.id)}><m.icon size={16}/>{m.label}</button>)}</div>
 <div ref={viewportRef} className="chat-messages" role="log" aria-label="Nội dung trò chuyện với gia sư" aria-live="polite" onScroll={e=>{const el=e.currentTarget;stickToBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;}}>{!messages.length&&<div className="chat-welcome"><span className="tutor-orb"><Sparkles size={35}/></span><span className="eyebrow">CHÀO EM, MÌNH LÀ SMARTNOTES AI TUTOR</span><h2>Điều gì đang làm em tò mò?</h2><p>{note?<>Mình cùng khám phá <strong>{note.title}</strong>. Em muốn hiểu công thức, xem ví dụ hay thử làm bài?</>:"Mình tìm kiến thức liên quan trong các bài em đã lưu. Em có thể chọn một bài cụ thể hoặc hỏi về thư viện."}</p><div className="chat-prompts">{["Giải thích ý chính bằng ngôn ngữ dễ hiểu","Gợi ý từng bước, để em tự tìm đáp án","Đặt một câu hỏi kiểm tra em đã hiểu bài"].map(q=><button disabled={busy||loading} key={q} onClick={()=>send(undefined,q)}><MessageCircle size={16}/>{q}<ArrowUpRight size={15}/></button>)}</div></div>}
 {messages.map((m,i)=><div className={"message "+m.role} key={i}>{m.role==="assistant"&&<span className="message-avatar"><Sparkles size={17}/></span>}<div>{m.role==="assistant"?<><Markdown content={m.content}/>{!!m.sources?.length&&<div className="tutor-sources"><span><BookOpen size={14}/>Bài học làm ngữ cảnh</span>{m.sources.map(s=><button key={s.noteId} onClick={()=>onOpenSource(s.noteId)}><b>[{s.reference}]</b><div><strong>{s.title}</strong><small>Lớp {s.grade} · {s.subject}</small></div><ArrowUpRight size={15}/></button>)}</div>}</>:<p>{m.content}</p>}</div></div>)}
 {(busy||loading)&&<div className="chat-thinking"><Loader2 className="spin" size={17}/>{busy?"Đang tìm kiến thức và soạn câu trả lời…":"Đang mở cuộc trò chuyện…"}</div>}</div>
 {error&&<p className="form-error chat-error" role="alert">{error}</p>}
 <form className="chat-input" onSubmit={send} aria-label="Soạn câu hỏi"><label className="sr-only" htmlFor="chat-message">Câu hỏi học tập</label><textarea ref={inputRef} id="chat-message" rows={1} enterKeyHint="enter" value={input} maxLength={3000} disabled={busy||loading} aria-describedby="chat-input-hint" placeholder="Em muốn hiểu thêm điều gì?" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing&&!window.matchMedia("(pointer:coarse)").matches){e.preventDefault();send();}}}/><div className="chat-input-footer"><span id="chat-input-hint" className="chat-input-hint"><Sparkles size={14}/><span>Hỏi, khám phá, hiểu bài</span><span className="chat-keyboard-hint">Shift + Enter để xuống dòng</span></span><div className="chat-input-actions"><span className="chat-character-count" aria-label={`${input.length} trên 3000 ký tự`}>{input.length > 0 ? `${input.length.toLocaleString("vi-VN")} / 3.000` : ""}</span><button className="send-button" disabled={busy||loading||!input.trim()} aria-label="Gửi câu hỏi">{busy?<Loader2 size={18} className="spin"/>:<Send size={18}/>}</button></div></div></form><div className="chat-disclaimer">AI có thể nhầm. Em hãy đối chiếu với vở và hỏi thầy cô khi cần.</div></div>
 <aside className="panel chat-context"><button type="button" className="context-close icon-button" aria-label="Đóng nguồn học" onClick={()=>setContextOpen(false)}><X size={20}/></button><span className="eyebrow">NGUỒN HỌC CỦA EM</span><h3><BookOpen size={20}/>Bắt đầu từ kiến thức</h3><SmartSelect label="Em đang học lớp" disabled={busy||!!note} value={String(activeGrade)} onChange={v=>setGrade(Number(v))} options={[6,7,8,9].map(g=>({value:String(g),label:"Lớp "+g}))}/><SmartSelect label="Bài học" disabled={busy} value={note?.id||""} onChange={onSelect} options={[{value:"",label:"Tìm trong thư viện của em"},...notes.map(n=>({value:n.id,label:"Lớp "+n.grade+" · "+n.title}))]}/>
 {note?<div className="context-note"><Tag>{note.subject}</Tag><h4>{note.title}</h4><span>Lớp {note.grade} · {note.chapter}</span><p>{note.summary}</p></div>:<div className="retrieval-note"><span className="retrieval-icon"><Sparkles size={22}/></span><strong>Gia sư hiểu những gì em đã lưu</strong><p>Mỗi câu hỏi được tìm trong bài học lớp {activeGrade} của em. Nếu chưa có nguồn phù hợp, gia sư sẽ nói rõ.</p></div>}
 <p className="context-tip"><Lightbulb size={20}/>Thử hỏi “Vì sao?”, “Khi nào dùng?” hoặc “Gợi ý để em tự làm”.</p></aside></div></div></>;
}
