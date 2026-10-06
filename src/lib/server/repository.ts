import oracledb from "oracledb";
import {db,rows} from "./oracle";
import {ApiError} from "./http";
import {noteSearchText,queryTerms,type TutorMessage} from "../tutor-context";
import type {Note,NoteInput,StudySet,Attempt} from "../schemas";
type NoteRow={NOTE_ID:string;GRADE:number;TITLE:string;SUBJECT:string;CHAPTER:string;SUMMARY:string;TAGS_JSON:string;CONTENT_JSON?:string;IMAGES_JSON?:string;STUDY_JSON?:string;CREATED_AT:Date;UPDATED_AT:Date};
const utc=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
function asNote(r:NoteRow):Note{return {id:r.NOTE_ID,grade:r.GRADE||6,title:r.TITLE,subject:r.SUBJECT,chapter:r.CHAPTER,content:"",summary:r.SUMMARY||"",tags:JSON.parse(r.TAGS_JSON||"[]"),...(r.CONTENT_JSON?JSON.parse(r.CONTENT_JSON):{}),images:r.IMAGES_JSON?JSON.parse(r.IMAGES_JSON):[],study:r.STUDY_JSON?JSON.parse(r.STUDY_JSON):undefined,createdAt:utc(r.CREATED_AT),updatedAt:utc(r.UPDATED_AT)};}
export async function listNotes(uid:string,offset:number){return db(async c=>{
 const r=await rows<NoteRow>(c,"SELECT note_id,grade,title,subject,chapter,summary,tags_json,created_at,updated_at FROM app_notes WHERE user_id=:uid ORDER BY updated_at DESC,note_id OFFSET :offset ROWS FETCH NEXT 51 ROWS ONLY",{uid,offset});
 return {notes:r.slice(0,50).map(asNote),nextOffset:r.length>50?offset+50:null};
});}
export async function getNote(uid:string,id:string){return db(async c=>{const [r]=await rows<NoteRow>(c,"SELECT * FROM app_notes WHERE note_id=:id AND user_id=:uid",{id,uid});if(!r)throw new ApiError(404,"NOT_FOUND","Không tìm thấy bài học.");return asNote(r);});}
export async function saveNote(uid:string,input:NoteInput,id?:string){
 const noteId=id||crypto.randomUUID();const {images,...content}=input;
 await db(async c=>{
 const binds={id:noteId,uid,grade:input.grade,search:{val:noteSearchText(input),type:oracledb.CLOB},title:input.title,subject:input.subject,chapter:input.chapter,summary:input.summary.slice(0,500),tags:JSON.stringify(input.tags),content:{val:JSON.stringify(content),type:oracledb.CLOB},images:{val:JSON.stringify(images),type:oracledb.CLOB}};
 if(id){
 const r=await c.execute("UPDATE app_notes SET grade=:grade,search_text=:search,title=:title,subject=:subject,chapter=:chapter,summary=:summary,tags_json=:tags,content_json=:content,images_json=:images,study_json=NULL,updated_at=SYS_EXTRACT_UTC(SYSTIMESTAMP) WHERE note_id=:id AND user_id=:uid",binds);
 if(!r.rowsAffected)throw new ApiError(404,"NOT_FOUND","Không tìm thấy bài.");
 await c.execute("DELETE FROM app_attempts WHERE note_id=:id AND user_id=:uid",{id,uid});
 }else await c.execute("INSERT INTO app_notes(note_id,user_id,grade,search_text,title,subject,chapter,summary,tags_json,content_json,images_json) VALUES(:id,:uid,:grade,:search,:title,:subject,:chapter,:summary,:tags,:content,:images)",binds);
 await c.commit();
 });return getNote(uid,noteId);
}
export async function deleteNote(uid:string,id:string){await db(async c=>{
 const r=await c.execute("DELETE FROM app_notes WHERE note_id=:id AND user_id=:uid",{id,uid});
 if(!r.rowsAffected)throw new ApiError(404,"NOT_FOUND","Không tìm thấy bài.");
 await c.execute("DELETE FROM app_chats WHERE context_id=:id AND user_id=:uid",{id,uid});await c.commit();
});}
export async function saveStudy(uid:string,id:string,study:StudySet,version:string){await db(async c=>{
 const r=await c.execute('UPDATE app_notes SET study_json=:study WHERE user_id=:uid AND note_id=:id AND updated_at=TO_TIMESTAMP(:version,\'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"\')',{study:{val:JSON.stringify(study),type:oracledb.CLOB},uid,id,version},{autoCommit:true});
 if(!r.rowsAffected)throw new ApiError(409,"NOTE_CHANGED","Bài vừa thay đổi. Hãy tạo lại bộ ôn.");
});}
export async function consumeAiQuota(uid:string){
 const value=Number(process.env.AI_DAILY_LIMIT||40);const lim=Number.isFinite(value)?Math.max(1,Math.floor(value)):40;
 await db(async c=>{
 const r=await c.execute<{accepted:number}>(`BEGIN
 BEGIN INSERT INTO app_ai_usage(user_id,usage_day,used_count) VALUES(:uid,TRUNC(SYS_EXTRACT_UTC(SYSTIMESTAMP)),0);
 EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
 UPDATE app_ai_usage SET used_count=used_count+1 WHERE user_id=:uid AND usage_day=TRUNC(SYS_EXTRACT_UTC(SYSTIMESTAMP)) AND used_count<:lim;
 :accepted := SQL%ROWCOUNT;
 END;`,{uid,lim,accepted:{dir:oracledb.BIND_OUT,type:oracledb.NUMBER}},{autoCommit:true});
 if(!r.outBinds?.accepted)throw new ApiError(429,"DAILY_LIMIT",`Đã hết ${lim} lượt AI hôm nay. Đặt lại lúc 07:00 giờ Việt Nam.`);
 });
}
export async function saveAttempt(uid:string,a:Attempt){await db(c=>c.execute('INSERT INTO app_attempts(attempt_id,user_id,note_id,mode,score,total,next_review_at) VALUES(:id,:uid,:noteId,:mode,:score,:total,TO_TIMESTAMP(:nextReviewAt,\'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"\'))',{id:a.id,uid,noteId:a.noteId,mode:a.mode,score:a.score,total:a.total,nextReviewAt:a.nextReviewAt},{autoCommit:true}));}
export async function listAttempts(uid:string):Promise<Attempt[]>{return db(async c=>{
 const r=await rows<{ATTEMPT_ID:string;NOTE_ID:string;MODE:Attempt["mode"];SCORE:number;TOTAL:number;CREATED_AT:Date;NEXT_REVIEW_AT:Date}>(c,"SELECT * FROM app_attempts WHERE user_id=:uid ORDER BY created_at DESC FETCH FIRST 200 ROWS ONLY",{uid});
 return r.map(x=>({id:x.ATTEMPT_ID,noteId:x.NOTE_ID,mode:x.MODE,score:x.SCORE,total:x.TOTAL,createdAt:utc(x.CREATED_AT),nextReviewAt:utc(x.NEXT_REVIEW_AT)}));
});}
export type Message=TutorMessage;
export async function getChat(uid:string,noteId?:string,grade=6):Promise<Message[]>{return db(async c=>{const [r]=await rows<{MESSAGES_JSON:string}>(c,"SELECT messages_json FROM app_chats WHERE user_id=:uid AND context_id=:context",{uid,context:noteId||"general-"+grade});return r?JSON.parse(r.MESSAGES_JSON):[];});}
export async function saveChat(uid:string,messages:Message[],noteId?:string,grade=6){await db(async c=>{
 if(noteId){const r=await rows(c,"SELECT note_id FROM app_notes WHERE user_id=:uid AND note_id=:id FOR UPDATE",{uid,id:noteId});if(!r.length)throw new ApiError(404,"NOT_FOUND","Bài đã bị xóa.");}
 await c.execute("MERGE INTO app_chats t USING (SELECT :uid user_id,:context context_id FROM dual) s ON (t.user_id=s.user_id AND t.context_id=s.context_id) WHEN MATCHED THEN UPDATE SET messages_json=:messages,updated_at=SYS_EXTRACT_UTC(SYSTIMESTAMP) WHEN NOT MATCHED THEN INSERT(user_id,context_id,messages_json) VALUES(:uid,:context,:messages)",{uid,context:noteId||"general-"+grade,messages:{val:JSON.stringify(messages.slice(-30)),type:oracledb.CLOB}});await c.commit();
});}

// Only candidates belonging to the authenticated UID are loaded; images never enter retrieval.
export async function findTutorNotes(uid:string,question:string,grade:number):Promise<Note[]>{
 const terms=queryTerms(question);if(!terms.length)return [];
 const binds:Record<string,string|number>={uid,grade};
 const predicates=terms.map((t,i)=>{binds["q"+i]=t;return "DBMS_LOB.INSTR(search_text,:q"+i+")>0";});
 return db(async c=>{const records=await rows<NoteRow>(c,"SELECT note_id,grade,title,subject,chapter,summary,tags_json,content_json,created_at,updated_at FROM app_notes WHERE user_id=:uid AND grade=:grade AND ("+predicates.join(" OR ")+") ORDER BY ("+terms.map((_,i)=>"CASE WHEN DBMS_LOB.INSTR(search_text,:q"+i+")>0 THEN 1 ELSE 0 END").join("+")+") DESC,updated_at DESC FETCH FIRST 80 ROWS ONLY",binds);return records.map(asNote);});
}
