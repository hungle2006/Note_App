import {z} from "zod";
import {requireUser} from "@/lib/server/auth";
import {failure,json,readJson} from "@/lib/server/http";
import {getDatabase} from "@/lib/server/turso";
import {forumRepository} from "@/lib/server/forum";

export const runtime="nodejs";
const action=z.discriminatedUnion("type",[
 z.object({type:z.literal("comment"),postId:z.uuid(),body:z.string().trim().min(2).max(1500),nickname:z.string().trim().min(2).max(24)}).strict(),
 z.object({type:z.literal("like"),postId:z.uuid(),active:z.boolean()}).strict(),
 z.object({type:z.literal("delete-post"),postId:z.uuid()}).strict(),
 z.object({type:z.literal("delete-comment"),commentId:z.uuid()}).strict(),
 z.object({type:z.literal("report"),postId:z.uuid(),commentId:z.uuid().optional(),reason:z.enum(["spam","bullying","personal-info","other"])}).strict(),
]);
export async function POST(request:Request){
 try{
  const user=await requireUser(request);
  const payload=await readJson(request,action,7000);
  return json(await forumRepository(await getDatabase()).action(user.uid,payload));
 }catch(error){return failure(error);}
}
