import {test} from "node:test";
import assert from "node:assert/strict";
import {noteInputSchema,imageSchema,studySchema,attemptSchema,gradeAttempt} from "../src/lib/schemas";
import {demoNotes,sampleStudy} from "../src/lib/demo";
const id=demoNotes[0].id;
test("demo notes and study conform to schemas",()=>{
 for(const n of demoNotes)assert.equal(noteInputSchema.safeParse(n).success,true);
 assert.equal(studySchema.safeParse(sampleStudy).success,true);
 assert.equal(new Set(demoNotes.map(n=>n.id)).size,demoNotes.length);
});
test("note schema trims labels and rejects missing content",()=>{
 assert.equal(noteInputSchema.parse({...demoNotes[0],title:"  test  "}).title,"test");
 assert.equal(noteInputSchema.safeParse({...demoNotes[0],content:"x"}).success,false);
});
test("only raster image data URLs accepted",()=>{
 for(const dataUrl of ["data:image/svg+xml;base64,PHN2Zz4=","https://example.com/x.png","data:text/html;base64,AAAA"])
 assert.equal(imageSchema.safeParse({name:"x",dataUrl}).success,false);
 assert.equal(imageSchema.safeParse({name:"x",dataUrl:"data:image/png;base64,AAAA"}).success,true);
});
test("image count and aggregate size bounded",()=>{
 const img={name:"x",dataUrl:"data:image/png;base64,"+"A".repeat(850000)};
 assert.equal(noteInputSchema.safeParse({...demoNotes[0],images:[img,img,img]}).success,false);
 assert.equal(noteInputSchema.safeParse({...demoNotes[0],images:Array(4).fill({...img,dataUrl:"data:image/png;base64,AAAA"})}).success,false);
});
test("quiz schema rejects invalid answer indices",()=>{
 assert.equal(studySchema.safeParse({...sampleStudy,quiz:sampleStudy.quiz.map(x=>({...x,answer:4}))}).success,false);
});
test("server grades quiz from stored answers with seven-day review",()=>{
 const r=gradeAttempt(sampleStudy,{noteId:id,mode:"quiz",answers:sampleStudy.quiz.map(x=>x.answer)});
 assert.equal(r.score,5);assert.equal(r.total,5);
 assert.ok(Date.parse(r.nextReviewAt)-Date.now()>6.9*86400000);
});
test("incorrect quiz gets one-day review",()=>{
 const r=gradeAttempt(sampleStudy,{noteId:id,mode:"quiz",answers:sampleStudy.quiz.map(x=>(x.answer+1)%4)});
 assert.equal(r.score,0);assert.ok(Date.parse(r.nextReviewAt)-Date.now()<1.1*86400000);
});
test("partial success gets three-day review",()=>{
 const r=gradeAttempt(sampleStudy,{noteId:id,mode:"quiz",answers:sampleStudy.quiz.map((x,i)=>i<3?x.answer:(x.answer+1)%4)});
 assert.equal(r.score,3);assert.ok(Math.abs(Date.parse(r.nextReviewAt)-Date.now()-3*86400000)<1000);
});
test("mismatched lengths cannot earn a score",()=>{
 assert.throws(()=>gradeAttempt(sampleStudy,{noteId:id,mode:"quiz",answers:[1,2,3,0]}));
});
test("flashcards count recalled cards",()=>{
 const r=gradeAttempt(sampleStudy,{noteId:id,mode:"flashcards",ratings:["again","good","easy","again","good","easy"]});
 assert.equal(r.score,4);assert.equal(r.total,6);
});
test("matching graded by source pair position",()=>{
 const r=gradeAttempt(sampleStudy,{noteId:id,mode:"match",matches:[0,1,2,4,3]});
 assert.equal(r.score,3);assert.equal(r.total,5);
});
test("client score discarded and unknown modes rejected",()=>{
 const p=attemptSchema.parse({noteId:id,mode:"quiz",answers:[1,2,3,0,1],score:999});
 assert.equal("score" in p,false);
 assert.equal(attemptSchema.safeParse({noteId:id,mode:"unknown",score:999}).success,false);
});
