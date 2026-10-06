import {json} from "@/lib/server/http";
import {firebaseAdminStatus} from "@/lib/server/auth-config";
import {firebaseAdminAuth} from "@/lib/server/firebase-admin";
import {ApiError} from "@/lib/server/http";
import {firebaseAdminConnection} from "@/lib/server/auth-connection";
export const runtime="nodejs";
export async function GET(request:Request){const firebaseAdmin=firebaseAdminStatus();let firebaseAdminRuntime="not-checked";if(firebaseAdmin==="ready"){try{firebaseAdminAuth();firebaseAdminRuntime="ready";}catch(error){firebaseAdminRuntime=error instanceof ApiError?error.code:"AUTH_INITIALIZATION_FAILED";}}const deep=new URL(request.url).searchParams.get("check")==="firebase";const firebaseConnection=deep?await firebaseAdminConnection():undefined;return json({firebase:firebaseAdmin==="ready"&&firebaseAdminRuntime==="ready"&&(!deep||firebaseConnection==="ready")&&Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_APP_ID),firebaseAdmin,firebaseAdminRuntime,...(deep?{firebaseConnection}:{}),gemini:Boolean(process.env.GEMINI_API_KEY),mistral:Boolean(process.env.MISTRAL_API_KEY),turso:Boolean(process.env.TURSO_DATABASE_URL&&process.env.TURSO_AUTH_TOKEN),databaseProvider:"turso",check:deep?"firebase-connection":"configuration"});}
