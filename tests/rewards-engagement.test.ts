import {test} from "node:test";
import assert from "node:assert/strict";
import {eligibleFitnessReward,fitnessAward,rewardCatalog,tierProgress} from "../src/lib/rewards";

test("workout bonus requires brief but meaningful activity, not endless repetitions",()=>{
 assert.equal(fitnessAward.perSession,4);
 assert.equal(fitnessAward.maxDistinctPerUtcDay,2);
 assert.equal(eligibleFitnessReward({id:"a",exercise:"squat",reps:3,seconds:200}),false);
 assert.equal(eligibleFitnessReward({id:"a",exercise:"squat",reps:500,seconds:29}),false);
 assert.equal(eligibleFitnessReward({id:"a",exercise:"squat",reps:4,seconds:30}),true);
 assert.equal(eligibleFitnessReward({id:"a",exercise:"squat",reps:-1,seconds:31}),false);
});
test("badge catalog retains old unlock IDs and adds new non-cash collectibles",()=>{
 assert.equal(rewardCatalog.length,6);
 for(const id of ["curious-star","knowledge-orbit","learning-universe"])
  assert.ok(rewardCatalog.some(reward=>reward.id===id));
 assert.equal(new Set(rewardCatalog.map(r=>r.id)).size,rewardCatalog.length);
});
test("lifetime-earned levels are stable when balance is spent on badges",()=>{
 const result=tierProgress(50);
 assert.equal(result.current.label,"Bạn khám phá");
 assert.equal(result.next?.label,"Người kết nối");
 assert.equal(result.remaining,5);
 assert.equal(tierProgress(0).progress,0);
 assert.equal(tierProgress(999).progress,100);
});
