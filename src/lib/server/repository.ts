import type {Client, Row, Transaction} from "@libsql/client";
import {getDatabase} from "./turso";
import {ApiError} from "./http";
import {noteSearchText,queryTerms,type TutorMessage} from "../tutor-context";
import type {Note,NoteInput,StudySet,Attempt} from "../schemas";

function asNote(r:Row):Note {
 const content=r.content_json?JSON.parse(String(r.content_json)):{};
 return {...content,id:String(r.note_id),grade:Number(r.grade),title:String(r.title),subject:String(r.subject),chapter:String(r.chapter),content:content.content||"",summary:content.summary??String(r.summary||""),tags:JSON.parse(String(r.tags_json||"[]")),images:r.images_json?JSON.parse(String(r.images_json)):[],study:r.study_json?JSON.parse(String(r.study_json)):undefined,createdAt:String(r.created_at),updatedAt:String(r.updated_at)};
}
async function write<T>(client:Client,work:(tx:Transaction)=>Promise<T>):Promise<T> {
 const tx=await client.transaction("write");
 try{const result=await work(tx);await tx.commit();return result;}
 catch(error){try{await tx.rollback();}catch{/* Keep the original error. */}throw error;}
 finally{tx.close();}
}
const missing=()=>new ApiError(404,"NOT_FOUND","Không tìm thấy bài học.");
export type Message=TutorMessage;

// Injectable client allows the same production SQL to be exercised against real libSQL in tests.
export function createRepository(client:Client) {
 async function getNote(uid:string,id:string) {
  const r=await client.execute({sql:"SELECT * FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id}});
  if(!r.rows[0])throw missing();return asNote(r.rows[0]);
 }
 return {
  getNote,
  async listNotes(uid:string,offset:number) {
   const r=await client.execute({sql:"SELECT note_id,grade,title,subject,chapter,summary,tags_json,created_at,updated_at FROM app_notes WHERE user_id=:uid ORDER BY updated_at DESC,note_id LIMIT 51 OFFSET :offset",args:{uid,offset}});
   return {notes:r.rows.slice(0,50).map(asNote),nextOffset:r.rows.length>50?offset+50:null};
  },
  async saveNote(uid:string,input:NoteInput,id?:string) {
   const noteId=id||crypto.randomUUID();const {images,...content}=input;
   return write(client,async tx=>{
    const args={id:noteId,uid,grade:input.grade,search:noteSearchText(input),title:input.title,subject:input.subject,chapter:input.chapter,summary:input.summary.slice(0,500),tags:JSON.stringify(input.tags),content:JSON.stringify(content),images:JSON.stringify(images)};
    if(id) {
     const r=await tx.execute({sql:`UPDATE app_notes SET grade=:grade,search_text=:search,title=:title,subject=:subject,chapter=:chapter,summary=:summary,tags_json=:tags,content_json=:content,images_json=:images,study_json=NULL,
      updated_at=CASE WHEN strftime('%Y-%m-%dT%H:%M:%fZ','now')>updated_at THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE strftime('%Y-%m-%dT%H:%M:%fZ',updated_at,'+0.001 seconds') END
      WHERE note_id=:id AND user_id=:uid`,args});
     if(!r.rowsAffected)throw missing();
     await tx.execute({sql:"DELETE FROM app_attempts WHERE user_id=:uid AND note_id=:id",args:{uid,id}});
    }else await tx.execute({sql:"INSERT INTO app_notes(note_id,user_id,grade,search_text,title,subject,chapter,summary,tags_json,content_json,images_json) VALUES(:id,:uid,:grade,:search,:title,:subject,:chapter,:summary,:tags,:content,:images)",args});
    const r=await tx.execute({sql:"SELECT * FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id:noteId}});
    return asNote(r.rows[0]);
   });
  },
  async deleteNote(uid:string,id:string) {
   await write(client,async tx=>{
    const owned=await tx.execute({sql:"SELECT note_id FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id}});
    if(!owned.rows.length)throw missing();
    // Explicit cleanup also protects installations with foreign_keys disabled.
    await tx.execute({sql:"DELETE FROM app_attempts WHERE user_id=:uid AND note_id=:id",args:{uid,id}});
    await tx.execute({sql:"DELETE FROM app_chats WHERE user_id=:uid AND context_id=:id",args:{uid,id}});
    await tx.execute({sql:"DELETE FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id}});
   });
  },
  async saveStudy(uid:string,id:string,study:StudySet,version:string) {
   const r=await client.execute({sql:"UPDATE app_notes SET study_json=:study WHERE user_id=:uid AND note_id=:id AND updated_at=:version",args:{study:JSON.stringify(study),uid,id,version}});
   if(!r.rowsAffected)throw new ApiError(409,"NOTE_CHANGED","Bài vừa thay đổi. Hãy tạo lại bộ ôn.");
  },
  async consumeAiQuota(uid:string) {
   const value=Number(process.env.AI_DAILY_LIMIT||40);const lim=Number.isFinite(value)?Math.max(1,Math.floor(value)):40;
   const r=await client.execute({sql:`INSERT INTO app_ai_usage(user_id,usage_day,used_count) VALUES(:uid,:day,1)
    ON CONFLICT(user_id,usage_day) DO UPDATE SET used_count=used_count+1 WHERE used_count<:lim RETURNING used_count`,args:{uid,day:new Date().toISOString().slice(0,10),lim}});
   if(!r.rows.length)throw new ApiError(429,"DAILY_LIMIT",`Đã hết ${lim} lượt AI hôm nay. Đặt lại lúc 07:00 giờ Việt Nam.`);
  },
  async saveAttempt(uid:string,a:Attempt) {
   await write(client,async tx=>{
    const owned=await tx.execute({sql:"SELECT note_id FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id:a.noteId}});
    if(!owned.rows.length)throw missing();
    await tx.execute({sql:"INSERT INTO app_attempts(attempt_id,user_id,note_id,mode,score,total,next_review_at) VALUES(:id,:uid,:noteId,:mode,:score,:total,:nextReviewAt)",args:{id:a.id,uid,noteId:a.noteId,mode:a.mode,score:a.score,total:a.total,nextReviewAt:a.nextReviewAt}});
   });
  },
  async listAttempts(uid:string):Promise<Attempt[]> {
   const r=await client.execute({sql:"SELECT * FROM app_attempts WHERE user_id=:uid ORDER BY created_at DESC,attempt_id LIMIT 200",args:{uid}});
   return r.rows.map(x=>({id:String(x.attempt_id),noteId:String(x.note_id),mode:x.mode as Attempt["mode"],score:Number(x.score),total:Number(x.total),createdAt:String(x.created_at),nextReviewAt:String(x.next_review_at)}));
  },
  async getChat(uid:string,noteId?:string,grade=6):Promise<Message[]> {
   const r=await client.execute({sql:"SELECT messages_json FROM app_chats WHERE user_id=:uid AND context_id=:context",args:{uid,context:noteId||"general-"+grade}});
   return r.rows.length?JSON.parse(String(r.rows[0].messages_json)):[];
  },
  async saveChat(uid:string,messages:Message[],noteId?:string,grade=6) {
   await write(client,async tx=>{
    if(noteId){const r=await tx.execute({sql:"SELECT note_id FROM app_notes WHERE user_id=:uid AND note_id=:id",args:{uid,id:noteId}});if(!r.rows.length)throw missing();}
    await tx.execute({sql:`INSERT INTO app_chats(user_id,context_id,note_id,messages_json) VALUES(:uid,:context,:noteId,:messages)
     ON CONFLICT(user_id,context_id) DO UPDATE SET messages_json=excluded.messages_json,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,args:{uid,context:noteId||"general-"+grade,noteId:noteId||null,messages:JSON.stringify(messages.slice(-30))}});
   });
  },
  async findTutorNotes(uid:string,question:string,grade:number):Promise<Note[]> {
   const terms=queryTerms(question);if(!terms.length)return [];
   const args:Record<string,string|number>={uid,grade};
   const predicates=terms.map((t,i)=>{args["q"+i]=t;return "instr(search_text,:q"+i+")>0";});
   // Owner and grade are always SQL filters. Images are excluded from tutor retrieval.
   const r=await client.execute({sql:"SELECT note_id,grade,title,subject,chapter,summary,tags_json,content_json,created_at,updated_at FROM app_notes WHERE user_id=:uid AND grade=:grade AND ("+predicates.join(" OR ")+") ORDER BY ("+predicates.map(p=>"CASE WHEN "+p+" THEN 1 ELSE 0 END").join("+")+") DESC,updated_at DESC LIMIT 80",args});
   return r.rows.map(asNote);
  },
 };
}
const repository=async()=>createRepository(await getDatabase());
export async function listNotes(uid:string,offset:number){return (await repository()).listNotes(uid,offset);}
export async function getNote(uid:string,id:string){return (await repository()).getNote(uid,id);}
export async function saveNote(uid:string,input:NoteInput,id?:string){return (await repository()).saveNote(uid,input,id);}
export async function deleteNote(uid:string,id:string){return (await repository()).deleteNote(uid,id);}
export async function saveStudy(uid:string,id:string,study:StudySet,version:string){return (await repository()).saveStudy(uid,id,study,version);}
export async function consumeAiQuota(uid:string){return (await repository()).consumeAiQuota(uid);}
export async function saveAttempt(uid:string,a:Attempt){return (await repository()).saveAttempt(uid,a);}
export async function listAttempts(uid:string){return (await repository()).listAttempts(uid);}
export async function getChat(uid:string,noteId?:string,grade=6){return (await repository()).getChat(uid,noteId,grade);}
export async function saveChat(uid:string,messages:Message[],noteId?:string,grade=6){return (await repository()).saveChat(uid,messages,noteId,grade);}
export async function findTutorNotes(uid:string,question:string,grade:number){return (await repository()).findTutorNotes(uid,question,grade);}
