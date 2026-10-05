import {cert,getApps,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {ApiError} from "./http";
export async function requireUser(request:Request){
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new ApiError(401,"UNAUTHENTICATED","Vui lòng đăng nhập.");
 const {FIREBASE_PROJECT_ID:projectId,FIREBASE_CLIENT_EMAIL:clientEmail,FIREBASE_PRIVATE_KEY:privateKey}=process.env;
 if(!projectId||!clientEmail||!privateKey)throw new ApiError(503,"AUTH_NOT_CONFIGURED","Máy chủ chưa kết nối Firebase.");
 let decoded;try{
 const app=getApps().find(a=>a.name==="notelab-admin")||initializeApp({credential:cert({projectId,clientEmail,privateKey:privateKey.replace(/\\n/g,"\n")})},"notelab-admin");
 decoded=await getAuth(app).verifyIdToken(token,true);
 }catch{throw new ApiError(401,"INVALID_TOKEN","Phiên đăng nhập hết hạn. Hãy đăng nhập lại.");}
 if(!decoded.email_verified)throw new ApiError(403,"EMAIL_NOT_VERIFIED","Hãy xác minh email trước khi sử dụng.");
 return {uid:decoded.uid,email:decoded.email||"",name:decoded.name||"Bạn"};
}
