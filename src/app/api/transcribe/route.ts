import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json} from "@/lib/server/http";
import {consumeAiQuota} from "@/lib/server/repository";
import {transcribeAudio,validateAudio} from "@/lib/server/vietscribe";
export const runtime="nodejs";export const maxDuration=240;
export async function POST(request:Request){try{
 const user=await requireUser(request);
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))throw new ApiError(400,"VOICE_BODY","Hãy gửi một file âm thanh.");
 const limit=4_100_000;if(Number(request.headers.get("content-length")||0)>limit)throw new ApiError(413,"AUDIO_INVALID","Âm thanh vượt 4 MB.");
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,"VOICE_BODY","Thiếu âm thanh.");const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new ApiError(413,"AUDIO_INVALID","Âm thanh vượt 4 MB.");chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 let data:FormData;try{data=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:Buffer.concat(chunks)}).formData();}catch{throw new ApiError(400,"VOICE_BODY","File âm thanh chưa hợp lệ.");}
 if(data.get("consent")!=="true")throw new ApiError(400,"VOICE_CONSENT","Cần đồng ý gửi âm thanh cho VietScribe.");
 const file=data.get("audio");if(!(file instanceof File)||data.getAll("audio").length!==1)throw new ApiError(400,"VOICE_BODY","Hãy chọn một file âm thanh.");
 await validateAudio(file);await consumeAiQuota(user.uid);return json({transcript:await transcribeAudio(file),provider:"vietscribe",mode:"rnnlm"});
 }catch(e){return failure(e);}}
