import {z} from "zod";
import {idSchema,gradeSchema} from "@/lib/schemas";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json,readJson} from "@/lib/server/http";
import {createChatThread,listChatThreads} from "@/lib/server/repository";
export const runtime="nodejs";

export async function GET(r:Request){try{
 const user=await requireUser(r),params=new URL(r.url).searchParams;
 const parsed=gradeSchema.safeParse(Number(params.get("grade")||6));
 if(!parsed.success)throw new ApiError(400,"INVALID_GRADE","Lớp không hợp lệ.");
 const noteId=params.get("noteId")||undefined;
 if(noteId&&!idSchema.safeParse(noteId).success)throw new ApiError(400,"INVALID_ID","Mã bài không hợp lệ.");
 return json({threads:await listChatThreads(user.uid,noteId,parsed.data)});
}catch(error){return failure(error);}}

export async function POST(r:Request){try{
 const user=await requireUser(r);
 const input=await readJson(r,z.object({grade:gradeSchema,noteId:idSchema.optional()}).strict());
 return json({thread:await createChatThread(user.uid,input.noteId,input.grade)},201);
}catch(error){return failure(error);}}
