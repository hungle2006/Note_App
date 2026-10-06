import {json} from "@/lib/server/http";
import {firebaseAdminStatus} from "@/lib/server/auth-config";
export const runtime="nodejs";
export async function GET(){const firebaseAdmin=firebaseAdminStatus();return json({firebase:firebaseAdmin==="ready"&&Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_APP_ID),firebaseAdmin,gemini:Boolean(process.env.GEMINI_API_KEY),mistral:Boolean(process.env.MISTRAL_API_KEY),turso:Boolean(process.env.TURSO_DATABASE_URL&&process.env.TURSO_AUTH_TOKEN),databaseProvider:"turso",check:"configuration"});}
