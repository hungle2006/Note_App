import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {initializeSchema} from '../src/lib/server/turso-schema';
import {leaderboardRepository} from '../src/lib/server/leaderboard';

async function setup(t:{after:(fn:()=>void)=>void}){
 const db=createClient({url:':memory:'});t.after(()=>db.close());await initializeSchema(db);
 const repository=leaderboardRepository(db);
 async function credit(uid:string,amount:number,source=crypto.randomUUID(),kind:'practice'|'redeem'='practice'){
  await db.execute({sql:'INSERT INTO app_points_ledger(event_id,user_id,source_key,kind,amount,label) VALUES(?,?,?,?,?,?)',args:[crypto.randomUUID(),uid,source,kind,amount,'Test credit']});
 }
 return {db,repository,credit};
}

test('only opted-in nicknames appear, including a participant with no points',async t=>{
 const {repository,credit}=await setup(t);
 await credit('secret',500);
 let board=await repository.list('viewer');
 assert.equal(board.participants,0);assert.equal(board.top.length,0);
 assert.equal(board.me.joined,false);assert.equal(board.me.earned,0);
 assert.equal((await repository.list('secret')).me.earned,500);
 await repository.setVisible('learner',true,'Mây Nhỏ');
 board=await repository.list('secret');
 assert.deepEqual(board.top,[{rank:1,nickname:'Mây Nhỏ',earned:0,isMe:false}]);
 assert.equal(board.participants,1);
 assert.equal(board.me.rank,null);
 assert.doesNotMatch(JSON.stringify(board),/secret|learner/);
});

test('Top 10 ranks all positive earned points and does not penalize spending',async t=>{
 const {repository,credit}=await setup(t);
 for(let i=0;i<12;i++){
  const uid='u'+String(i).padStart(2,'0');
  await repository.setVisible(uid,true,'Ngôi sao '+String(i).padStart(2,'0'));
  await credit(uid,10*(i+1));
 }
 await credit('u11',-90,'redeem:pet','redeem');
 const board=await repository.list('u00');
 assert.equal(board.participants,12);assert.equal(board.top.length,10);
 assert.equal(board.top[0].nickname,'Ngôi sao 11');assert.equal(board.top[0].earned,120);
 assert.equal(board.top[9].nickname,'Ngôi sao 02');
 assert.equal(board.me.rank,12);
 assert.equal(board.me.earned,10);
 assert.equal(board.top.every(x=>x.rank>0&&x.rank<=10),true);
 const top=await repository.list('u11');
 assert.equal(top.me.rank,1);assert.equal(top.me.earned,120);
 assert.equal(top.top[0].isMe,true);
});

test('hiding nickname removes person immediately and cannot delete earned points',async t=>{
 const {repository,credit}=await setup(t);
 await repository.setVisible('one',true,'Bạn Học');
 await repository.setVisible('two',true,'Ánh Dương');
 await credit('one',25);await credit('two',70);
 await repository.setVisible('two',false);
 const result=await repository.list('one');
 assert.equal(result.participants,1);
 assert.deepEqual(result.top.map(x=>x.nickname),['Bạn Học']);
 assert.equal((await repository.list('two')).me.earned,70);
 assert.equal((await repository.list('two')).me.joined,false);
 assert.equal((await repository.list('two')).me.rank,null);
 await repository.setVisible('two',true,'Ánh Dương');
 assert.equal((await repository.list('one')).top[0].earned,70);
});

test('nicknames reject email-like, links and malformed input; ties have consistent order',async t=>{
 const {repository}=await setup(t);
 for(const name of ['A','user@example.com','https://site.vn','Mây ❤️','A'.repeat(25)])
  await assert.rejects(repository.setVisible('unsafe',true,name),{code:'INVALID_NICKNAME'});
 await repository.setVisible('a',true,'An');await repository.setVisible('b',true,'Bình');
 const first=await repository.list('b'),again=await repository.list('b');
 assert.deepEqual(first.top.map(x=>x.nickname),['An','Bình']);
 assert.deepEqual(first.top,again.top);
});
