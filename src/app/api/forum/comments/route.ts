import {z} from "zod";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json} from "@/lib/server/http";
import {getDatabase} from "@/lib/server/turso";
import {forumRepository} from "@/lib/server/forum";

export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const user=await requireUser(request),params=new URL(request.url).searchParams;
  const postId=params.get("postId")||"";
  if(!z.uuid().safeParse(postId).success)throw new ApiError(400,"INVALID_ID","Câu hỏi không hợp lệ.");
  const offset=z.coerce.number().int().min(0).max(1000).parse(params.get("offset")||"0");
  return json(await forumRepository(await getDatabase()).comments(user.uid,postId,offset));
 }catch(error){return failure(error);}
}
