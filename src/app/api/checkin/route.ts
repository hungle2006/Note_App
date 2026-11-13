import {requireUser} from '@/lib/server/auth';
import {failure,json} from '@/lib/server/http';
import {getDatabase} from '@/lib/server/turso';
import {communityRepository} from '@/lib/server/community';
import {getWallet} from '@/lib/server/repository';
export const runtime='nodejs';
export async function GET(r:Request){try{const u=await requireUser(r);return json({checkin:await communityRepository(await getDatabase()).checkins(u.uid)});}catch(e){return failure(e);}}
export async function POST(r:Request){try{const u=await requireUser(r);const checkin=await communityRepository(await getDatabase()).claim(u.uid);return json({checkin,wallet:await getWallet(u.uid)});}catch(e){return failure(e);}}
