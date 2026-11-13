import {z} from 'zod';
import {requireUser} from '@/lib/server/auth';
import {firebaseAdminAuth} from '@/lib/server/firebase-admin';
import {ApiError,failure,json,readJson} from '@/lib/server/http';
import {communityRepository} from '@/lib/server/community';
import {getDatabase} from '@/lib/server/turso';
export const runtime='nodejs';
export async function GET(r:Request){try{
 const u=await requireUser(r),p=new URL(r.url).searchParams,repo=communityRepository(await getDatabase());
 if(p.get('directory')==='1'){
  const q=(p.get('q')||'').trim().slice(0,100),page=p.get('page')||undefined;
  if(page&&page.length>1500)throw new ApiError(400,'PAGE_INVALID','Trang không hợp lệ.');
  const auth=firebaseAdminAuth();
  const users=q.includes('@')?{users:await auth.getUserByEmail(q).then(x=>[x]).catch((e)=>{if(e.code==='auth/user-not-found')return [];throw e;}),pageToken:undefined}:await auth.listUsers(100,page);
  const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return json({people:users.users.filter(x=>x.uid!==u.uid&&x.emailVerified&&!x.disabled&&(q.includes('@')||fold(x.displayName||'Người học').includes(fold(q)))).slice(0,100).map(x=>({id:x.uid,name:x.displayName||'Người học'})),nextPage:users.pageToken||null});
 }
 return json({threads:await repo.threads(u.uid),selfId:u.uid});
 }catch(e){return failure(e);}}
export async function POST(r:Request){try{
 const u=await requireUser(r),v=await readJson(r,z.object({peerId:z.string().min(1).max(128)}).strict());
 const peer=await firebaseAdminAuth().getUser(v.peerId);
 if(peer.disabled||!peer.emailVerified)throw new ApiError(404,'PEER_MISSING','Tài khoản chưa sẵn sàng để trò chuyện.');
 return json({id:await communityRepository(await getDatabase()).open(u.uid,u.name,v.peerId,peer.displayName||'Người học')});
 }catch(e){return failure(e);}}
