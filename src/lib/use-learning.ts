"use client";
import {useEffect,useState,useCallback} from "react";import {api} from "./client-api";import {cloneDemo} from "./demo";import {gradeAttempt,type Note,type NoteInput,type StudySet,type Attempt,type attemptSchema} from "./schemas";import type {z} from "zod";
const key="notelab-demo-v1";
export function useLearning(demo:boolean,uid?:string){
const [notes,setNotes]=useState<Note[]>([]);const [attempts,setAttempts]=useState<Attempt[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [next,setNext]=useState<number|null>(null);
const load=useCallback(async()=>{setLoading(true);setError("");try{
if(demo){try{const d=JSON.parse(localStorage.getItem(key)||"null");setNotes(d?.notes||cloneDemo());setAttempts(d?.attempts||[]);}catch{setNotes(cloneDemo());setAttempts([]);}}
else if(uid){const [n,a]=await Promise.all([api<{notes:Note[];nextOffset:number|null}>("/notes"),api<{attempts:Attempt[]}>("/attempts")]);setNotes(n.notes);setNext(n.nextOffset);setAttempts(a.attempts);}
}catch(e){setError(e instanceof Error?e.message:"Không tải được thư viện.");}finally{setLoading(false);}},[demo,uid]);
useEffect(()=>{load();},[load]);
function persist(n:Note[],a:Attempt[]){if(demo){try{localStorage.setItem(key,JSON.stringify({notes:n,attempts:a}));}catch{throw new Error("Bộ nhớ bản mẫu đầy. Bài chưa được lưu; hãy giảm ảnh hoặc đặt lại bản mẫu.");}}}
async function get(id:string){if(demo){const n=notes.find(n=>n.id===id);if(!n)throw new Error("Không tìm thấy bài.");return n;}return (await api<{note:Note}>("/notes/"+id)).note;}
async function save(input:NoteInput,id?:string){const now=new Date().toISOString();const note:Note=demo?{...input,id:id||crypto.randomUUID(),createdAt:notes.find(n=>n.id===id)?.createdAt||now,updatedAt:now}:(await api<{note:Note}>(id?"/notes/"+id:"/notes",{method:id?"PATCH":"POST",body:JSON.stringify(input)})).note;
const n=[note,...notes.filter(n=>n.id!==note.id)];const a=id?attempts.filter(a=>a.noteId!==id):attempts;persist(n,a);setNotes(n);setAttempts(a);return note;}
async function remove(id:string){if(!demo)await api("/notes/"+id,{method:"DELETE"});const n=notes.filter(n=>n.id!==id);const a=attempts.filter(a=>a.noteId!==id);persist(n,a);setNotes(n);setAttempts(a);}
async function study(note:Note){if(note.study)return note.study;if(demo)throw new Error("Bản mẫu có bộ ôn cho Phân phối nhị thức. Bài khác cần kết nối Gemini.");const {study}=await api<{study:StudySet}>("/study",{method:"POST",body:JSON.stringify({noteId:note.id})});setNotes(old=>old.map(n=>n.id===note.id?{...n,study}:n));return study;}
async function record(input:z.infer<typeof attemptSchema>,study:StudySet){const attempt:Attempt=demo?{id:crypto.randomUUID(),noteId:input.noteId,mode:input.mode,...gradeAttempt(study,input),createdAt:new Date().toISOString()}:(await api<{attempt:Attempt}>("/attempts",{method:"POST",body:JSON.stringify(input)})).attempt;const a=[attempt,...attempts].slice(0,200);persist(notes,a);setAttempts(a);return attempt;}
async function more(){if(next===null)return;const r=await api<{notes:Note[];nextOffset:number|null}>("/notes?offset="+next);setNotes(old=>[...old,...r.notes.filter(n=>!old.some(x=>x.id===n.id))]);setNext(r.nextOffset);}
function reset(){persist(cloneDemo(),[]);setNotes(cloneDemo());setAttempts([]);}
return {notes,attempts,loading,error,load,get,save,remove,study,record,more,hasMore:next!==null,reset};
}export type Learning=ReturnType<typeof useLearning>;
