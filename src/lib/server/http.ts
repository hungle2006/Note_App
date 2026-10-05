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
