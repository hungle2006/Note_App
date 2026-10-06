import {z} from "zod";
import {idSchema,gradeSchema} from "@/lib/schemas";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json,readJson} from "@/lib/server/http";
import {getNote,getChat,saveChat,consumeAiQuota,findTutorNotes} from "@/lib/server/repository";
import {tutor} from "@/lib/server/mistral";
import {selectTutorSources} from "@/lib/tutor-context";
export const runtime="nodejs";export const maxDuration=60;

export async function GET(r:Request){try{
 const u=await requireUser(r);const params=new URL(r.url).searchParams;const id=params.get("noteId");
 const parsedGrade=gradeSchema.safeParse(Number(params.get("grade")||6));if(!parsedGrade.success)throw new ApiError(400,"INVALID_GRADE","Lớp không hợp lệ.");
 if(id&&!idSchema.safeParse(id).success)throw new ApiError(400,"INVALID_ID","Mã bài không hợp lệ.");
 if(id)await getNote(u.uid,id);
 return json({messages:await getChat(u.uid,id||undefined,parsedGrade.data)});
}catch(e){return failure(e);}}
export async function POST(r:Request){try{
 const u=await requireUser(r);
 const input=await readJson(r,z.object({message:z.string().trim().min(1).max(3000),noteId:idSchema.optional(),grade:gradeSchema.default(6),mode:z.enum(["explain","hint","practice"]).default("explain")}));
 if(!process.env.MISTRAL_API_KEY)throw new ApiError(503,"TUTOR_NOT_CONFIGURED","Gia sư Mistral chưa được kết nối.");
 const selected=input.noteId?await getNote(u.uid,input.noteId):undefined;
 const history=await getChat(u.uid,input.noteId,input.grade);
 // Follow-up questions use a small amount of the student's previous wording for retrieval.
 const previous=history.filter(m=>m.role==="user").slice(-2).map(m=>m.content).join(" ").slice(-500);
 const question=input.message+" "+previous;
 const candidates=selected?[selected]:await findTutorNotes(u.uid,question,input.grade);
 const sources=selectTutorSources(candidates,question,{grade:selected?.grade||input.grade,noteId:selected?.id});
 const messages=[...history.slice(-9),{role:"user" as const,content:input.message}];
 await consumeAiQuota(u.uid);
 const answer=await tutor(messages,sources,selected?.grade||input.grade,input.mode);
 const updated=[...history,{role:"user" as const,content:input.message},{role:"assistant" as const,content:answer,sources}].slice(-30);
 await saveChat(u.uid,updated,input.noteId,input.grade);
 return json({messages:updated,sources,provider:"mistral"});
}catch(e){return failure(e);}}
