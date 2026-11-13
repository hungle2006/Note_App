import {z} from 'zod';
import {requireUser} from '@/lib/server/auth';
import {failure,json,readJson} from '@/lib/server/http';
import {getDatabase} from '@/lib/server/turso';
import {communityRepository} from '@/lib/server/community';
export const runtime='nodejs';
export async function GET(r:Request){try{const u=await requireUser(r);return json(await communityRepository(await getDatabase()).presence(u.uid));}catch(e){return failure(e);}}
export async function POST(r:Request){try{const u=await requireUser(r);await communityRepository(await getDatabase()).heartbeat(u.uid);return json({ok:true});}catch(e){return failure(e);}}
export async function PATCH(r:Request){try{const u=await requireUser(r);const p=await readJson(r,z.object({showOnline:z.boolean()}).strict());await communityRepository(await getDatabase()).setPresence(u.uid,p.showOnline);return json({ok:true});}catch(e){return failure(e);}}
