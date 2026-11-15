import {z} from 'zod';
import {requireUser} from '@/lib/server/auth';
import {failure,json,readJson} from '@/lib/server/http';
import {getDatabase} from '@/lib/server/turso';
import {leaderboardRepository} from '@/lib/server/leaderboard';

export const runtime='nodejs';

export async function GET(request:Request){
 try{
  const user=await requireUser(request);
  return json(await leaderboardRepository(await getDatabase()).list(user.uid));
 }catch(error){return failure(error);}
}
export async function PATCH(request:Request){
 try{
  const user=await requireUser(request);
  const payload=await readJson(request,z.object({
   visible:z.boolean(),nickname:z.string().trim().max(24).optional()
  }).strict());
  const repository=leaderboardRepository(await getDatabase());
  await repository.setVisible(user.uid,payload.visible,payload.nickname);
  return json(await repository.list(user.uid));
 }catch(error){return failure(error);}
}
