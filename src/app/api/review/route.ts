import {z} from 'zod';
import {gradeSchema,referenceSchema} from '@/lib/schemas';
import {requireUser} from '@/lib/server/auth';
import {failure,json,readJson} from '@/lib/server/http';
import {consumeAiQuota} from '@/lib/server/repository';
import {reviewAgainstReference} from '@/lib/server/gemini';
export const runtime='nodejs';export const maxDuration=60;
const input=z.object({content:z.string().trim().min(10).max(40000),grade:gradeSchema,subject:z.string().max(160),reference:referenceSchema,consent:z.literal(true)}).strict();
export async function POST(request:Request){try{const u=await requireUser(request);const p=await readJson(request,input,230000);await consumeAiQuota(u.uid);return json({checks:await reviewAgainstReference(p.content,p.reference,p.grade,p.subject),referenceLabel:p.reference.label});}catch(e){return failure(e);}}
