import type {DecodedIdToken} from "firebase-admin/auth";
import {ApiError} from "./http";
import {firebaseAdminConfig} from "./auth-config";
import {authFailure} from "./auth-failure";
export async function requireUser(request:Request){
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new ApiError(401,"UNAUTHENTICATED","Vui lòng đăng nhập.");
 const config=firebaseAdminConfig();
 let auth:import("firebase-admin/auth").Auth;try{
 // Load the CJS entry only after the auth/config checks. Keeps the route's
 // userland module synchronous for Vercel's Next.js function adapter.
 const {cert,getApps,initializeApp}=require("firebase-admin/app") as typeof import("firebase-admin/app");
 const {getAuth}=require("firebase-admin/auth") as typeof import("firebase-admin/auth");
 const app=getApps().find(a=>a.name==="notelab-admin")||initializeApp({credential:cert(config)},"notelab-admin");
 auth=getAuth(app);
 }catch(error){throw authFailure(error,"initialize");}
 let decoded:DecodedIdToken;try{
 decoded=await auth.verifyIdToken(token,true);
 }catch(error){throw authFailure(error,"verify");}
 if(!decoded.email_verified)throw new ApiError(403,"EMAIL_NOT_VERIFIED","Hãy xác minh email trước khi sử dụng.");
 return {uid:decoded.uid,email:decoded.email||"",name:decoded.name||"Bạn"};
}
