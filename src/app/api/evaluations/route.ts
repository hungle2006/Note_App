import {requireUser} from '@/lib/server/auth';import {failure,json} from '@/lib/server/http';import {listEvaluationNotes} from '@/lib/server/repository';
export const runtime='nodejs';
export async function GET(r:Request){try{const u=await requireUser(r);return json({notes:await listEvaluationNotes(u.uid)});}catch(e){return failure(e);}}
