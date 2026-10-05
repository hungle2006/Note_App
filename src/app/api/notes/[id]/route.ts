import {requireUser} from "@/lib/server/auth";import {ApiError,failure,json,readJson} from "@/lib/server/http";import {getNote,saveNote,deleteNote} from "@/lib/server/repository";import {idSchema,noteInputSchema} from "@/lib/schemas";
export const runtime="nodejs";type Context={params:Promise<{id:string}>};
async function identity(r:Request,ctx:Context){const u=await requireUser(r);const p=idSchema.safeParse((await ctx.params).id);if(!p.success)throw new ApiError(400,"INVALID_ID","Mã bài không hợp lệ.");return {uid:u.uid,id:p.data};}
export async function GET(r:Request,ctx:Context){try{const {uid,id}=await identity(r,ctx);return json({note:await getNote(uid,id)});}catch(e){return failure(e);}}
export async function PATCH(r:Request,ctx:Context){try{const {uid,id}=await identity(r,ctx);return json({note:await saveNote(uid,await readJson(r,noteInputSchema,3000000),id)});}catch(e){return failure(e);}}
export async function DELETE(r:Request,ctx:Context){try{const {uid,id}=await identity(r,ctx);await deleteNote(uid,id);return json({deleted:true});}catch(e){return failure(e);}}
