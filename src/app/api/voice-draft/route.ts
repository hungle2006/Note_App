import {voiceDraftInputSchema} from "@/lib/schemas";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json,readJson} from "@/lib/server/http";
import {consumeAiQuota} from "@/lib/server/repository";
import {formatVoiceNote} from "@/lib/server/gemini";
export const runtime="nodejs";export const maxDuration=60;
export async function POST(request:Request){try{
 const user=await requireUser(request);
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new ApiError(415,"TEXT_ONLY","Gemini chỉ nhận bản chép lời dạng văn bản, không nhận file âm thanh.");
 const p=await readJson(request,voiceDraftInputSchema,180000);
 if(!process.env.GEMINI_API_KEY)throw new ApiError(503,"AI_NOT_CONFIGURED","Gemini chưa được kết nối. Bản chép lời vẫn có thể lưu thủ công.");
 await consumeAiQuota(user.uid);return json({extraction:await formatVoiceNote(p.transcript,p.grade,p.subject),provider:"gemini",source:"transcript"});
 }catch(e){return failure(e);}}
