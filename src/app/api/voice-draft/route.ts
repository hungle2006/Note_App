import {z} from "zod";
import {gradeSchema} from "@/lib/schemas";
import {requireUser} from "@/lib/server/auth";
import {ApiError,failure,json,readMultipart} from "@/lib/server/http";
import {consumeAiQuota} from "@/lib/server/repository";
import {validateAudio} from "@/lib/server/vietscribe";
import {formatVoiceNote} from "@/lib/server/gemini";
export const runtime="nodejs";export const maxDuration=60;
const metadata=z.object({transcript:z.string().trim().max(40000),grade:gradeSchema,subject:z.string().trim().max(160)});
const mimes:Record<string,string>={wav:"audio/wav",mp3:"audio/mpeg",m4a:"audio/mp4",ogg:"audio/ogg",webm:"audio/webm",flac:"audio/flac"};
export async function POST(request:Request){try{
 const user=await requireUser(request);const form=await readMultipart(request);
 if(form.get("consentGemini")!=="true")throw new ApiError(400,"GEMINI_CONSENT","Cần đồng ý để Gemini kiểm tra và sắp xếp ghi chép.");
 const p=metadata.safeParse({transcript:form.get("transcript")||"",grade:Number(form.get("grade")||6),subject:form.get("subject")||""});if(!p.success)throw new ApiError(400,"VALIDATION",p.error.issues[0].message);
 const file=form.get("audio");let audio: {mimeType:string;data:string}|undefined;
 if(file!==null){if(!(file instanceof File)||form.getAll("audio").length!==1)throw new ApiError(400,"AUDIO_INVALID","Hãy chọn một file âm thanh.");await validateAudio(file);audio={mimeType:mimes[file.name.split(".").pop()!.toLowerCase()],data:Buffer.from(await file.arrayBuffer()).toString("base64")};}
 if(!audio&&p.data.transcript.length<10)throw new ApiError(400,"VOICE_EMPTY","Hãy nhập ít nhất 10 ký tự hoặc chọn âm thanh.");
 if(!process.env.GEMINI_API_KEY)throw new ApiError(503,"AI_NOT_CONFIGURED","Gemini chưa được kết nối. Bản chép lời vẫn có thể lưu thủ công.");
 await consumeAiQuota(user.uid);return json({extraction:await formatVoiceNote(p.data.transcript,p.data.grade,p.data.subject,audio),provider:"gemini",audioChecked:Boolean(audio)});
 }catch(e){return failure(e);}}
