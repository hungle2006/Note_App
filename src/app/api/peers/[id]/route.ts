import {z} from 'zod';
import {requireUser} from '@/lib/server/auth';
import {ApiError,failure,json,readJson} from '@/lib/server/http';
import {communityRepository} from '@/lib/server/community';
import {getDatabase} from '@/lib/server/turso';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{const u=await requireUser(r),{id}=await c.params;const raw=new URL(r.url).searchParams.get('before'),before=raw?Number(raw):undefined;if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new ApiError(400,'CURSOR_INVALID','Trang tin nhắn không hợp lệ.');return json(await communityRepository(await getDatabase()).messages(u.uid,id,before));}catch(e){return failure(e);}}
export async function POST(r:Request,c:Context){try{const u=await requireUser(r),{id}=await c.params,v=await readJson(r,z.object({body:z.string().trim().min(1).max(2000),messageId:z.uuid()}).strict(),12000);await communityRepository(await getDatabase()).send(u.uid,id,v.body,v.messageId);return json({sent:true});}catch(e){return failure(e);}}
export async function PATCH(r:Request,c:Context){try{const u=await requireUser(r),{id}=await c.params,v=await readJson(r,z.object({blocked:z.boolean()}).strict());await communityRepository(await getDatabase()).block(u.uid,id,v.blocked);return json({ok:true});}catch(e){return failure(e);}}
