import {idSchema} from "@/lib/schemas";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json} from "@/lib/server/http";
import {deleteChatThread,getChatThread} from "@/lib/server/repository";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
async function ownedId(context:Context){
 const {id}=await context.params;
 if(!idSchema.safeParse(id).success)throw new ApiError(400,"INVALID_ID","Mã cuộc trò chuyện không hợp lệ.");
 return id;
}
export async function GET(r:Request,context:Context){try{
 const user=await requireUser(r);
 return json({thread:await getChatThread(user.uid,await ownedId(context))});
}catch(error){return failure(error);}}
export async function DELETE(r:Request,context:Context){try{
 const user=await requireUser(r);
 await deleteChatThread(user.uid,await ownedId(context));
 return json({deleted:true});
}catch(error){return failure(error);}}
