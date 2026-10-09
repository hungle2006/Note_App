import {ApiError} from "./http";
import {AUDIO_MAX_BYTES,audioFileError} from "../audio";
const base="https://leminhhung0101-vietscribe-ai.hf.space/gradio_api";
export async function validateAudio(file:File){
 const error=audioFileError(file);if(error)throw new ApiError(file.size>AUDIO_MAX_BYTES?413:400,"AUDIO_INVALID",error);
 const b=new Uint8Array(await file.slice(0,16).arrayBuffer());const text=new TextDecoder().decode(b);
 const valid=text.startsWith("RIFF")&&text.slice(8,12)==="WAVE"||text.startsWith("ID3")||b[0]===255&&(b[1]&224)===224||text.startsWith("OggS")||text.startsWith("fLaC")||text.slice(4,8)==="ftyp"||b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163;
 if(!valid)throw new ApiError(400,"AUDIO_INVALID","File không có định dạng âm thanh hợp lệ.");
}
export async function readTranscript(response:Response){
 if(!response.body)throw new ApiError(502,"VOICE_FORMAT","VietScribe chưa trả kết quả.");
 const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="",total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>200_000)throw new ApiError(502,"VOICE_FORMAT","Kết quả nhận dạng quá lớn.");buffer=(buffer+decoder.decode(value,{stream:true})).replace(/\r\n/g,"\n");
 let split:number;while((split=buffer.indexOf("\n\n"))!==-1){const block=buffer.slice(0,split);buffer=buffer.slice(split+2);const event=block.split("\n").find(l=>l.startsWith("event:"))?.slice(6).trim();
 if(event==="error"){const payload=block.split("\n").filter(l=>l.startsWith("data:")).map(l=>l.slice(5)).join("\n");if(/ZeroGPU|quota exceeded|runs limit/i.test(payload))throw new ApiError(429,"VOICE_QUOTA","VietScribe đang hết hạn mức Hugging Face. Quản trị viên cần cấu hình token hoặc chờ hạn mức được cấp lại.");throw new ApiError(503,"VOICE_UPSTREAM","VietScribe chưa xử lý được đoạn này. Hãy thử đoạn ngắn hơn hoặc thử lại sau.");}
 if(event==="complete"){let data:unknown;try{data=JSON.parse(block.split("\n").filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trim()).join("\n"));}catch{throw new ApiError(502,"VOICE_FORMAT","Kết quả nhận dạng chưa hợp lệ.");}
 if(!Array.isArray(data)||typeof data[0]!=="string")throw new ApiError(502,"VOICE_FORMAT","Kết quả nhận dạng chưa hợp lệ.");
 const transcript=data[0].trim();if(!transcript)throw new ApiError(422,"VOICE_EMPTY","Chưa nghe rõ lời nói. Em thử ghi gần micro và nói rõ hơn nhé.");if(transcript.length>40000)throw new ApiError(413,"VOICE_TOO_LONG","Bản chép lời quá dài. Hãy chia thành các đoạn ngắn.");return transcript;}
 }}throw new ApiError(502,"VOICE_INCOMPLETE","Nhận dạng bị gián đoạn. Hãy thử lại sau.");}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function transcribeAudio(file:File){
 const signal=AbortSignal.timeout(210_000);const token=process.env.VIETSCRIBE_HF_TOKEN?.trim();const headers:Record<string,string>=token?{Authorization:"Bearer "+token}:{};
 async function call(path:string,init:RequestInit={}){const r=await fetch(base+path,{...init,headers:{...headers,...init.headers},signal,redirect:"error"});if(!r.ok)throw new ApiError(r.status===429?429:503,"VOICE_UPSTREAM",r.status===429?"VietScribe đang hết lượt xử lý. Hãy thử lại sau.":"VietScribe chưa sẵn sàng. Hãy thử lại sau.");return r;}
 try{
 const form=new FormData();form.append("files",file,"voice-note."+file.name.split(".").pop()?.toLowerCase());
 const upload=await (await call("/upload",{method:"POST",body:form})).json();if(!Array.isArray(upload)||typeof upload[0]!=="string"||!upload[0].startsWith("/tmp/"))throw new ApiError(502,"VOICE_FORMAT","Chưa tải được âm thanh lên VietScribe.");
 const job=await (await call("/call/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:[{path:upload[0],meta:{_type:"gradio.FileData"}},"rnnlm"]})})).json();
 if(typeof job.event_id!=="string"||! /^[a-zA-Z0-9_-]{1,128}$/.test(job.event_id))throw new ApiError(502,"VOICE_FORMAT","Chưa tạo được lượt nhận dạng.");
 return await readTranscript(await call("/call/transcribe/"+job.event_id));
 }catch(e){if(e instanceof ApiError)throw e;throw new ApiError(signal.aborted?504:503,signal.aborted?"VOICE_TIMEOUT":"VOICE_UNAVAILABLE",signal.aborted?"Nhận dạng đang chờ quá lâu. Hãy thử đoạn ngắn hơn hoặc thử lại sau.":"Chưa kết nối được VietScribe. Hãy thử lại sau.");}
}
