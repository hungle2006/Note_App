import {createClient, type Client} from "@libsql/client/http";
import {ApiError} from "./http";
import {initializeSchema} from "./turso-schema";

let ready:Promise<Client>|undefined;
export async function getDatabase():Promise<Client> {
 const url=process.env.TURSO_DATABASE_URL?.trim();
 const authToken=process.env.TURSO_AUTH_TOKEN?.trim();
 if(!url||!authToken)throw new ApiError(503,"DATABASE_NOT_CONFIGURED","Chưa cấu hình Turso. Bài học chưa được lưu.");
 // Production uses HTTP, never a file in Vercel's ephemeral filesystem.
 if(!/^(libsql|https):\/\//.test(url))throw new ApiError(503,"DATABASE_CONFIG_INVALID","TURSO_DATABASE_URL phải là URL database libsql:// hoặc https://.");
 if(!ready)ready=(async()=>{
  const client=createClient({url,authToken,fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{
   ...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000),
  })});
  try{await initializeSchema(client);return client;}
  catch{client.close();throw new ApiError(503,"DATABASE_UNAVAILABLE","Chưa kết nối được Turso. Kiểm tra URL, quyền ghi và thời hạn token database.");}
 })();
 try{return await ready;}catch(error){ready=undefined;throw error;}
}
