import assert from "node:assert/strict";
import {test} from "node:test";
import {angle,EXERCISES,newMotionState,processMotion,type Landmark} from "../src/lib/fitness-engine";
import {FITNESS_LIBRARY,AI_EXERCISES,GUIDED_EXERCISES,searchFitnessLibrary} from "../src/lib/fitness-catalog";
function shape(bent:boolean):Landmark[]{
 const data=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
 const assign=(i:number,x:number,y:number)=>{data[i]={x,y,visibility:1};};
 assign(11,.43,.20);assign(12,.57,.20);
 assign(23,.43,bent?.48:.42);assign(24,.57,bent?.48:.42);
 assign(25,.43,.69);assign(26,.57,.69);
 assign(27,bent?.72:.43,bent?.69:.95);assign(28,bent?.86:.57,bent?.69:.95);
 return data;
}
test("seven supported workout types",()=>{assert.equal(EXERCISES.length,7);assert.equal(new Set(EXERCISES.map(x=>x.id)).size,7);});
test("angle is measured from three landmarks",()=>{
 assert.ok(Math.abs((angle({x:1,y:0},{x:0,y:0},{x:0,y:1})||0)-90)<.0001);
 assert.equal(angle(null,{x:0,y:0},{x:1,y:0}),null);
});
test("squat counts completed up-down-up, not partial movement",()=>{
 let state=newMotionState();
 for(const [ms,bent] of [[1000,false],[1400,false],[1800,true],[2250,true],[2800,false]] as const){
  const result=processMotion("squat",shape(bent),state,ms);
  state=result.state;
 }
 assert.equal(state.count,1);
 state=processMotion("squat",shape(false),state,3200).state;
 assert.equal(state.count,1);
});
test("out of frame landmarks never count",()=>{
 const state=newMotionState();
 const result=processMotion("squat",[],state,1000);
 assert.equal(result.accepted,false);
 assert.equal(result.ready,false);
});

test("catalog includes exactly 100 unique documented workouts",()=>{
 assert.equal(FITNESS_LIBRARY.length,100);
 assert.equal(AI_EXERCISES.length,7);
 assert.equal(GUIDED_EXERCISES.length,93);
 assert.equal(new Set(FITNESS_LIBRARY.map(x=>x.id)).size,100);
 assert.ok(FITNESS_LIBRARY.every(x=>x.instruction.length>32&&x.name.length>4));
});
test("only validated seven pose modes claim AI counting",()=>{
 assert.deepEqual(new Set(AI_EXERCISES.map(x=>x.aiId)),new Set(EXERCISES.map(x=>x.id)));
 assert.ok(GUIDED_EXERCISES.every(x=>x.kind==="guided"&&!x.aiId));
 assert.equal(searchFitnessLibrary("","ai").length,7);
});
test("Vietnamese accent insensitive search and category filtering",()=>{
 assert.ok(searchFitnessLibrary("gian co").length>0);
 assert.ok(searchFitnessLibrary("squat").some(x=>x.id==="squat"));
 assert.ok(searchFitnessLibrary("","balance").length>=10);
 assert.equal(searchFitnessLibrary("","all","Nâng cao").every(x=>x.level==="Nâng cao"),true);
});
