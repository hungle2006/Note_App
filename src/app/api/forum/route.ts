import {z} from "zod";
import {requireUser} from "@/lib/server/auth";
import {failure,json,readJson} from "@/lib/server/http";
import {getDatabase} from "@/lib/server/turso";
import {forumRepository,forumSubjects} from "@/lib/server/forum";

export const runtime="nodejs";
const newPost=z.object({
 nickname:z.string().trim().min(2).max(24),
 subject:z.enum(forumSubjects),
 title:z.string().trim().min(8).max(160),
 body:z.string().trim().min(15).max(3000)
}).strict();

export async function GET(request:Request){
 try{
  const user=await requireUser(request),params=new URL(request.url).searchParams;
  const sort=z.enum(["hot","new","mine"]).parse(params.get("sort")||"hot");
  const subject=z.union([z.enum(forumSubjects),z.literal("")]).parse(params.get("subject")||"");
  const q=(params.get("q")||"").trim().slice(0,80);
  const offset=z.coerce.number().int().min(0).max(1000).parse(params.get("offset")||"0");
  return json(await forumRepository(await getDatabase()).list(user.uid,{sort,subject,q,offset}));
 }catch(error){return failure(error);}
}
export async function POST(request:Request){
 try{
  const user=await requireUser(request);
  const payload=await readJson(request,newPost,9000);
  return json(await forumRepository(await getDatabase()).create(user.uid,payload),201);
 }catch(error){return failure(error);}
}
