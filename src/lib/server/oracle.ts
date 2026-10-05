import oracledb from "oracledb";
import {ApiError} from "./http";
declare global{var noteLabPool:Promise<oracledb.Pool>|undefined;}
export async function db<T>(work:(c:oracledb.Connection)=>Promise<T>):Promise<T>{
 if(!process.env.ORACLE_USER||!process.env.ORACLE_PASSWORD||!process.env.ORACLE_CONNECT_STRING)throw new ApiError(503,"DATABASE_NOT_CONFIGURED","Chưa cấu hình Oracle. Bài học chưa được lưu.");
 if(!global.noteLabPool)global.noteLabPool=oracledb.createPool({
 user:process.env.ORACLE_USER,password:process.env.ORACLE_PASSWORD,connectString:process.env.ORACLE_CONNECT_STRING,
 ...(process.env.ORACLE_WALLET_PEM_BASE64?{walletContent:Buffer.from(process.env.ORACLE_WALLET_PEM_BASE64,"base64").toString("utf8"),walletPassword:process.env.ORACLE_WALLET_PASSWORD}:{}),
 poolMin:0,poolMax:2,poolIncrement:1,poolTimeout:60,queueTimeout:10000,connectTimeout:10,transportConnectTimeout:10,sslServerDNMatch:true
 }).catch(e=>{global.noteLabPool=undefined;throw e;});
 const c=await(await global.noteLabPool).getConnection();c.callTimeout=15000;try{return await work(c);}finally{await c.close();}
}
export async function rows<T>(c:oracledb.Connection,sql:string,binds:oracledb.BindParameters={}){
 const r=await c.execute<T>(sql,binds,{outFormat:oracledb.OUT_FORMAT_OBJECT,fetchInfo:{CONTENT_JSON:{type:oracledb.STRING},IMAGES_JSON:{type:oracledb.STRING},STUDY_JSON:{type:oracledb.STRING},MESSAGES_JSON:{type:oracledb.STRING}}});return r.rows||[];
}
