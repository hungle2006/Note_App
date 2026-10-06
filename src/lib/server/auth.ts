import type {DecodedIdToken} from "firebase-admin/auth";
import {ApiError} from "./http";
import {firebaseAdminAuth} from "./firebase-admin";
import {authFailure} from "./auth-failure";
export async function requireUser(request:Request){
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new ApiError(401,"UNAUTHENTICATED","Vui lòng đăng nhập.");
 const auth=firebaseAdminAuth();
 let decoded:DecodedIdToken;try{
 decoded=await auth.verifyIdToken(token,true);
 }catch(error){throw authFailure(error,"verify");}
 if(!decoded.email_verified)throw new ApiError(403,"EMAIL_NOT_VERIFIED","Hãy xác minh email trước khi sử dụng.");
 return {uid:decoded.uid,email:decoded.email||"",name:decoded.name||"Bạn"};
}
