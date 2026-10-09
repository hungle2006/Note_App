import {z} from "zod";
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message);}}
export async function readJson<T>(request:Request,schema:z.ZodType<T>,limit=100000):Promise<T>{
 if(Number(request.headers.get("content-length")||0)>limit)throw new ApiError(413,"TOO_LARGE","Dữ liệu quá lớn.");
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,"INVALID_BODY","Thiếu nội dung.");
 let length=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new ApiError(413,"TOO_LARGE","Dữ liệu quá lớn.");}chunks.push(value);}
 let data:unknown;try{data=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new ApiError(400,"INVALID_JSON","JSON không hợp lệ.");}
 const p=schema.safeParse(data);if(!p.success)throw new ApiError(400,"VALIDATION",p.error.issues[0]?.message||"Dữ liệu không hợp lệ.");return p.data;
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export function failure(error:unknown){
 const requestId=crypto.randomUUID();
 if(error instanceof ApiError)return json({error:error.message,code:error.code,requestId},error.status);
 console.error("NoteLab request failed",{requestId,name:error instanceof Error?error.name:"UnknownError"});
 return json({error:"Dịch vụ gặp sự cố. Vui lòng thử lại.",code:"INTERNAL",requestId},500);
}
export async function readMultipart(request:Request,limit=4_250_000):Promise<FormData>{
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))throw new ApiError(400,"VOICE_BODY","Hãy gửi âm thanh hoặc bản chép lời.");
 if(Number(request.headers.get("content-length")||0)>limit)throw new ApiError(413,"AUDIO_INVALID","Dữ liệu âm thanh quá lớn.");
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,"VOICE_BODY","Thiếu nội dung.");const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new ApiError(413,"AUDIO_INVALID","Dữ liệu âm thanh quá lớn.");chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 try{return await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:Buffer.concat(chunks)}).formData();}catch{throw new ApiError(400,"VOICE_BODY","Nội dung gửi lên chưa hợp lệ.");}
}
