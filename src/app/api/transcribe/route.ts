import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json,readMultipart} from "@/lib/server/http";
import {consumeAiQuota} from "@/lib/server/repository";
import {transcribeAudio,validateAudio} from "@/lib/server/vietscribe";
export const runtime="nodejs";export const maxDuration=240;
export async function POST(request:Request){try{
 const user=await requireUser(request);
 const data=await readMultipart(request,4_100_000);
 if(data.get("consent")!=="true")throw new ApiError(400,"VOICE_CONSENT","Cần đồng ý gửi âm thanh cho VietScribe.");
 const file=data.get("audio");if(!(file instanceof File)||data.getAll("audio").length!==1)throw new ApiError(400,"VOICE_BODY","Hãy chọn một file âm thanh.");
 await validateAudio(file);await consumeAiQuota(user.uid);return json({transcript:await transcribeAudio(file),provider:"vietscribe",mode:"rnnlm"});
 }catch(e){return failure(e);}}
