"use client";
import {useState} from "react";import {Eye,FileText,Save,Loader2} from "lucide-react";import {noteInputSchema,type NoteInput} from "@/lib/schemas";import {Markdown} from "./ui";
export function NoteEditor({initial,uncertain=[],editing=false,onSave,onCancel}:{initial:NoteInput;uncertain?:string[];editing?:boolean;onSave:(n:NoteInput)=>Promise<void>;onCancel:()=>void}){
const [data,setData]=useState(initial);const [tags,setTags]=useState(initial.tags.join(", "));const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
function field(k:keyof NoteInput,v:string){setData(d=>({...d,[k]:v}));}
async function submit(e:React.FormEvent){e.preventDefault();setError("");const p=noteInputSchema.safeParse({...data,tags:tags.split(",").map(t=>t.trim()).filter(Boolean)});if(!p.success){setError(p.error.issues[0].message);return;}setBusy(true);try{await onSave(p.data);}catch(e){setError(e instanceof Error?e.message:"Chưa lưu được bài.");}finally{setBusy(false);}}
return <form className="note-editor panel" onSubmit={submit}><div className="editor-heading"><FileText/><div><h2>{editing?"Chỉnh sửa bài học":"Kiểm tra & lưu bài học"}</h2><p>{editing?"Lưu sẽ đặt lại bộ ôn và kết quả cũ để khớp bài mới.":"Đọc lại chữ, công thức và phần phân loại trước khi lưu."}</p></div></div>
{uncertain.length>0&&<div className="notice warning"><strong>Có phần cần bạn kiểm tra</strong><ul>{uncertain.map((u,i)=><li key={i}>{u}</li>)}</ul></div>}
<label>Tên bài học<input required maxLength={160} value={data.title} onChange={e=>field("title",e.target.value)} placeholder="Ví dụ: Cộng và rút gọn phân số"/></label>
<label>Lớp học<select value={data.grade} onChange={e=>setData(d=>({...d,grade:Number(e.target.value)}))}>{[6,7,8,9].map(g=><option key={g} value={g}>Lớp {g}</option>)}</select></label>
<div className="form-row"><label>Môn học<input required maxLength={160} value={data.subject} onChange={e=>field("subject",e.target.value)} placeholder="Toán học"/></label><label>Chương / chủ đề<input required maxLength={160} value={data.chapter} onChange={e=>field("chapter",e.target.value)} placeholder="Chương 5 · Phân số"/></label></div>
<label>Tóm tắt<textarea rows={3} maxLength={6000} value={data.summary} onChange={e=>field("summary",e.target.value)}/></label>
<label>Thẻ chủ đề (ngăn cách bằng dấu phẩy)<input value={tags} maxLength={730} onChange={e=>setTags(e.target.value)}/></label>
<div className="editor-toolbar"><strong>Nội dung bài học</strong><button type="button" className="text-button" onClick={()=>setPreview(!preview)}>{preview?<FileText size={16}/>:<Eye size={16}/>} {preview?"Chỉnh sửa":"Xem trước"}</button></div>
{preview?<div className="editor-preview"><Markdown content={data.content}/></div>:<label><span className="sr-only">Nội dung bài học</span><textarea className="content-editor" required minLength={10} maxLength={40000} rows={16} value={data.content} onChange={e=>field("content",e.target.value)} placeholder="Markdown và công thức $…$ hoặc $$…$$."/></label>}
<small className="hint">{data.content.length.toLocaleString("vi-VN")}/40.000 ký tự · hỗ trợ Markdown/LaTeX.</small>{error&&<p className="form-error" role="alert">{error}</p>}
<div className="editor-actions"><button type="button" className="button secondary" disabled={busy} onClick={onCancel}>Quay lại</button><button className="button primary" disabled={busy}>{busy?<Loader2 className="spin" size={17}/>:<Save size={17}/>} Lưu vào thư viện</button></div></form>;
}
