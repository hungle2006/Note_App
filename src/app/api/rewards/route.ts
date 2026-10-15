import {z} from 'zod';import {requireUser} from '@/lib/server/auth';import {failure,json,readJson} from '@/lib/server/http';import {getWallet,redeemReward} from '@/lib/server/repository';
export const runtime='nodejs';
export async function GET(r:Request){try{const u=await requireUser(r);return json({wallet:await getWallet(u.uid)});}catch(e){return failure(e);}}
export async function POST(r:Request){try{const u=await requireUser(r);const p=await readJson(r,z.object({rewardId:z.string().min(1).max(60)}).strict());await redeemReward(u.uid,p.rewardId);return json({wallet:await getWallet(u.uid)});}catch(e){return failure(e);}}
