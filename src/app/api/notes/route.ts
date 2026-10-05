import {requireUser} from "@/lib/server/auth";import {failure,json,readJson} from "@/lib/server/http";import {listNotes,saveNote} from "@/lib/server/repository";import {noteInputSchema} from "@/lib/schemas";
export const runtime="nodejs";
export async function GET(r:Request){try{const u=await requireUser(r);const raw=Number(new URL(r.url).searchParams.get("offset")||0);return json(await listNotes(u.uid,Number.isInteger(raw)&&raw>=0?raw:0));}catch(e){return failure(e);}}
export async function POST(r:Request){try{const u=await requireUser(r);return json({note:await saveNote(u.uid,await readJson(r,noteInputSchema,3000000))},201);}catch(e){return failure(e);}}
