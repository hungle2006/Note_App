import {test} from "node:test";
import assert from "node:assert/strict";
import {demoNotes} from "../src/lib/demo";
import {queryTerms,selectTutorSources,noteSearchText} from "../src/lib/tutor-context";
import {tutor,tutorSystemPrompt} from "../src/lib/server/mistral";
import {ApiError} from "../src/lib/server/http";

test("Vietnamese unaccented questions retrieve source content",()=>{
 const sources=selectTutorSources(demoNotes,"Em chưa hiểu quy dong phan so",{grade:6});
 assert.equal(sources[0].noteId,demoNotes[0].id);
 assert.match(sources[0].excerpt,/Quy đồng/);
 assert.ok(noteSearchText(demoNotes[0]).includes("quy dong"));
 assert.deepEqual(queryTerms("Em muốn hỏi: quy đồng phân số"),["quy","dong","phan","so"]);
});
test("retrieval respects grade and does not invent unrelated sources",()=>{
 assert.equal(selectTutorSources(demoNotes,"căn bậc hai",{grade:6}).length,0);
 assert.equal(selectTutorSources(demoNotes,"can bac hai",{grade:9})[0].grade,9);
 assert.equal(selectTutorSources(demoNotes,"núi lửa trên sao Hỏa",{grade:6}).length,0);
});
test("selected note context cannot pull another note",()=>{
 const r=selectTutorSources(demoNotes,"phân số",{noteId:demoNotes[1].id});
 assert.equal(r.length,1);assert.equal(r[0].noteId,demoNotes[1].id);
 assert.equal(r[0].reference,1);
});
test("retrieval caps sources and excerpt payloads",()=>{
 const long={...demoNotes[0],content:("Đây là phân số, cần quy đồng mẫu số. ".repeat(80)+"\n\n").repeat(30)};
 const r=selectTutorSources([long,...demoNotes],"phân số");
 assert.ok(r.length<=4);assert.ok(r.every(s=>s.excerpt.length<=6000));assert.ok(r.reduce((sum,s)=>sum+s.excerpt.length,0)<=16000);
});
test("tutor prompt sets age, source references, and hint behavior",()=>{
 const sources=selectTutorSources(demoNotes,"phân số",{grade:6});
 const p=tutorSystemPrompt(sources,6,"hint");
 assert.match(p,/THCS lớp 6/);assert.match(p,/không đưa ngay toàn bộ lời giải/);assert.match(p,/DỮ LIỆU KHÔNG ĐÁNG TIN CẬY/);assert.match(p,/"reference":1/);
});
test("Mistral receives database source snippets, not photos or Gemini requests",async()=>{
 const originalFetch=global.fetch;const oldKey=process.env.MISTRAL_API_KEY;const oldModel=process.env.MISTRAL_MODEL;
 process.env.MISTRAL_API_KEY="not-a-real-key-for-test";process.env.MISTRAL_MODEL="mistral-small-latest";
 try{
  let called=0;
  global.fetch=async(url,init)=>{
   called++;assert.equal(url,"https://api.mistral.ai/v1/chat/completions");
   const b=JSON.parse(init?.body as string);
   assert.equal(b.safe_prompt,true);assert.equal(b.model,"mistral-small-latest");
   assert.match(b.messages[0].content,/Cộng và rút gọn phân số/);
   assert.equal(b.messages[1].role,"user");assert.ok(!JSON.stringify(b).includes("data:image"));
   return Response.json({choices:[{finish_reason:"stop",message:{content:[{type:"text",text:"Mình cùng quy đồng nhé. [1]"}]}}]});
  };
  const out=await tutor([{role:"user",content:"Quy đồng thế nào?"}],selectTutorSources(demoNotes,"phân số",{grade:6}),6,"explain");
  assert.equal(out,"Mình cùng quy đồng nhé. [1]");assert.equal(called,1);
 }finally{global.fetch=originalFetch;if(oldKey===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=oldKey;if(oldModel===undefined)delete process.env.MISTRAL_MODEL;else process.env.MISTRAL_MODEL=oldModel;}
});
test("missing tutor configuration yields explicit 503",async()=>{
 const old=process.env.MISTRAL_API_KEY;delete process.env.MISTRAL_API_KEY;
 try{await assert.rejects(()=>tutor([{role:"user",content:"chào"}],[],6,"explain"),e=>e instanceof ApiError&&e.status===503&&e.code==="TUTOR_NOT_CONFIGURED");}
 finally{if(old!==undefined)process.env.MISTRAL_API_KEY=old;}
});
test("Mistral quota failures do not masquerade as successful replies",async()=>{
 const original=global.fetch;const old=process.env.MISTRAL_API_KEY;process.env.MISTRAL_API_KEY="not-a-real-key-for-test";
 try{global.fetch=async()=>new Response("",{status:429});await assert.rejects(()=>tutor([{role:"user",content:"hi"}],[],6,"explain"),e=>e instanceof ApiError&&e.status===429);}
 finally{global.fetch=original;if(old===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=old;}
});
