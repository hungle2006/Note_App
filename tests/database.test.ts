import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClient,type Client} from '@libsql/client';
import {createRepository,type Message} from '../src/lib/server/repository';
import {initializeSchema,schemaVersion} from '../src/lib/server/turso-schema';
import {getDatabase} from '../src/lib/server/turso';
import {sampleStudy} from '../src/lib/demo';
import type {NoteInput,Attempt} from '../src/lib/schemas';

const input:NoteInput={grade:6,title:'Cộng phân số',subject:'Toán',chapter:'Phân số',summary:'Quy đồng mẫu số trước khi cộng',content:'Muốn cộng hai phân số khác mẫu, ta quy đồng mẫu rồi cộng các tử số.',tags:['phân số'],images:[{name:'vở.png',dataUrl:'data:image/png;base64,AAAA'}]};
const messages:Message[]=[{role:'user',content:'Giải thích quy đồng mẫu số'},{role:'assistant',content:'Ta tìm một mẫu số chung.'}];
const attempt=(noteId:string):Attempt=>({id:crypto.randomUUID(),noteId,mode:'quiz',score:4,total:5,createdAt:new Date().toISOString(),nextReviewAt:new Date(Date.now()+86400000).toISOString()});
async function database(t:{after:(fn:()=>void)=>void}) {
 const client=createClient({url:':memory:'});t.after(()=>client.close());
 await client.execute('PRAGMA foreign_keys=ON');await initializeSchema(client);
 return {client,repo:createRepository(client)};
}
const rejectsCode=(code:string)=>(error:unknown)=>Boolean(error&&typeof error==='object'&&'code' in error&&error.code===code);

test('Turso schema is repeatable and SQL-console migration preserves existing notes',async t=>{
 const {client,repo}=await database(t);const n=await repo.saveNote('alice',input);
 await initializeSchema(client);
 await client.executeMultiple(readFileSync(new URL('../database/001_turso.sql',import.meta.url),'utf8'));
 assert.equal((await repo.getNote('alice',n.id)).content,input.content);
 const migrations=await client.execute('SELECT version FROM app_migrations');assert.deepEqual(migrations.rows.map(x=>x.version),[schemaVersion]);
 const tables=await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'app_%'");assert.equal(tables.rows.length,5);
});

test('notes round-trip Vietnamese, images and UTC timestamps; all CRUD enforces owner',async t=>{
 const {repo}=await database(t);const n=await repo.saveNote('alice',input);
 assert.deepEqual(n.images,input.images);assert.equal(n.content,input.content);assert.equal(n.grade,6);
 assert.match(n.createdAt,/Z$/);assert.ok(Number.isFinite(Date.parse(n.updatedAt)));
 assert.equal((await repo.listNotes('bob',0)).notes.length,0);
 await assert.rejects(repo.getNote('bob',n.id),rejectsCode('NOT_FOUND'));
 await assert.rejects(repo.saveNote('bob',{...input,title:'Bài khác'},n.id),rejectsCode('NOT_FOUND'));
 await assert.rejects(repo.deleteNote('bob',n.id),rejectsCode('NOT_FOUND'));
 assert.equal((await repo.getNote('alice',n.id)).title,input.title);
});

test('pagination returns 50 per page with no missing/duplicate IDs and omits images',async t=>{
 const {repo}=await database(t);const ids=new Set<string>();
 for(let i=0;i<52;i++)ids.add((await repo.saveNote('alice',{...input,title:'Bài '+i})).id);
 await repo.saveNote('bob',input);
 const first=await repo.listNotes('alice',0);const second=await repo.listNotes('alice',first.nextOffset!);
 assert.equal(first.notes.length,50);assert.equal(second.notes.length,2);assert.equal(second.nextOffset,null);
 assert.deepEqual(new Set([...first.notes,...second.notes].map(n=>n.id)),ids);
 assert.ok(first.notes.every(n=>n.images.length===0&&n.content===''));
});

test('editing invalidates study/attempts and rejects stale AI results including same-millisecond edits',async t=>{
 const {repo}=await database(t);const n=await repo.saveNote('alice',input);
 await repo.saveStudy('alice',n.id,sampleStudy,n.updatedAt);await repo.saveAttempt('alice',attempt(n.id));
 const newer=await repo.saveNote('alice',{...input,content:input.content+' Ví dụ thêm.'},n.id);
 assert.ok(newer.updatedAt>n.updatedAt);assert.equal(newer.study,undefined);assert.deepEqual(await repo.listAttempts('alice'),[]);
 await assert.rejects(repo.saveStudy('alice',n.id,sampleStudy,n.updatedAt),rejectsCode('NOTE_CHANGED'));
 await repo.saveStudy('alice',n.id,sampleStudy,newer.updatedAt);assert.deepEqual((await repo.getNote('alice',n.id)).study,sampleStudy);
});

test('multi-statement writes roll back when a later SQL statement fails',async t=>{
 const {client,repo}=await database(t);const n=await repo.saveNote('alice',input);await repo.saveAttempt('alice',attempt(n.id));
 await client.execute("CREATE TRIGGER test_fail_delete BEFORE DELETE ON app_attempts BEGIN SELECT RAISE(ABORT,'test failure'); END");
 await assert.rejects(repo.saveNote('alice',{...input,title:'Thay đổi'},n.id));
 assert.equal((await repo.getNote('alice',n.id)).title,input.title);assert.equal((await repo.getNote('alice',n.id)).updatedAt,n.updatedAt);
 assert.equal((await repo.listAttempts('alice')).length,1);
});

test('attempt and note-chat writes reject foreign owners; composite foreign keys add protection',async t=>{
 const {client,repo}=await database(t);const n=await repo.saveNote('alice',input);
 await assert.rejects(repo.saveAttempt('bob',attempt(n.id)),rejectsCode('NOT_FOUND'));
 await assert.rejects(repo.saveChat('bob',messages,n.id),rejectsCode('NOT_FOUND'));
 await assert.rejects(client.execute({sql:"INSERT INTO app_attempts(attempt_id,user_id,note_id,mode,score,total,next_review_at) VALUES(?,?,'"+n.id+"','quiz',1,1,?)",args:[crypto.randomUUID(),'bob',new Date().toISOString()]}));
 await repo.saveAttempt('alice',attempt(n.id));assert.equal((await repo.listAttempts('alice')).length,1);assert.deepEqual(await repo.listAttempts('bob'),[]);
});

test('deleting a note removes attempts and note chat but retains separate library chat and other users',async t=>{
 const {repo}=await database(t);const n=await repo.saveNote('alice',input);const other=await repo.saveNote('bob',input);
 await repo.saveAttempt('alice',attempt(n.id));await repo.saveChat('alice',messages,n.id);await repo.saveChat('alice',messages,undefined,6);
 await repo.saveChat('bob',messages,other.id);await repo.deleteNote('alice',n.id);
 await assert.rejects(repo.getNote('alice',n.id),rejectsCode('NOT_FOUND'));assert.deepEqual(await repo.listAttempts('alice'),[]);assert.deepEqual(await repo.getChat('alice',n.id),[]);
 assert.deepEqual(await repo.getChat('alice',undefined,6),messages);assert.deepEqual(await repo.getChat('bob',other.id),messages);
 await assert.rejects(repo.saveChat('alice',messages,n.id),rejectsCode('NOT_FOUND'));
});

test('library chat is grade-scoped and stores only the most recent 30 messages',async t=>{
 const {repo}=await database(t);const long:Message[]=Array.from({length:40},(_,i)=>({role:'user',content:'Tin '+i}));
 await repo.saveChat('alice',long,undefined,6);await repo.saveChat('alice',messages,undefined,7);
 assert.deepEqual(await repo.getChat('alice',undefined,6),long.slice(-30));assert.deepEqual(await repo.getChat('alice',undefined,7),messages);assert.deepEqual(await repo.getChat('bob',undefined,6),[]);
});

test('Mistral SQL retrieval finds unaccented terms beyond first page and excludes foreign users/grades/images',async t=>{
 const {repo}=await database(t);const wanted=await repo.saveNote('alice',input);
 for(let i=0;i<51;i++)await repo.saveNote('alice',{...input,title:'Văn '+i,subject:'Ngữ văn',chapter:'Thơ',content:'Những vần thơ nói về mùa thu và quê hương.',summary:'Mùa thu',tags:[],images:[]});
 await repo.saveNote('bob',input);await repo.saveNote('alice',{...input,grade:9});
 const found=await repo.findTutorNotes('alice','quy dong phan so',6);
 assert.deepEqual(found.map(n=>n.id),[wanted.id]);assert.equal(found[0].content,input.content);assert.deepEqual(found[0].images,[]);
 assert.deepEqual(await repo.findTutorNotes('charlie','phan so',6),[]);
});

test('AI quota is atomic under concurrent requests, separated by user and UTC day',async t=>{
 const before=process.env.AI_DAILY_LIMIT;process.env.AI_DAILY_LIMIT='5';t.after(()=>{if(before===undefined)delete process.env.AI_DAILY_LIMIT;else process.env.AI_DAILY_LIMIT=before;});
 const {client,repo}=await database(t);
 await client.execute("INSERT INTO app_ai_usage VALUES('alice','2000-01-01',999)");
 const results=await Promise.allSettled(Array.from({length:20},()=>repo.consumeAiQuota('alice')));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
 for(const r of results)if(r.status==='rejected')assert.ok(rejectsCode('DAILY_LIMIT')(r.reason));
 const today=await client.execute({sql:'SELECT used_count FROM app_ai_usage WHERE user_id=? AND usage_day=?',args:['alice',new Date().toISOString().slice(0,10)]});assert.equal(today.rows[0].used_count,5);
 await repo.consumeAiQuota('bob');await assert.rejects(repo.consumeAiQuota('alice'),rejectsCode('DAILY_LIMIT'));
});

test('missing/invalid Turso config fails clearly without opening a connection at import/build',async t=>{
 const previous=[process.env.TURSO_DATABASE_URL,process.env.TURSO_AUTH_TOKEN];t.after(()=>{['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN'].forEach((k,i)=>{if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];});});
 delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
 await assert.rejects(getDatabase(),rejectsCode('DATABASE_NOT_CONFIGURED'));
 process.env.TURSO_DATABASE_URL='file:local.db';process.env.TURSO_AUTH_TOKEN='test';
 await assert.rejects(getDatabase(),rejectsCode('DATABASE_CONFIG_INVALID'));
});
