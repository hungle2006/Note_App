import {test} from "node:test";import assert from "node:assert/strict";
import {audioFileError} from "../src/lib/audio";
import {validateAudio,readTranscript,transcribeAudio} from "../src/lib/server/vietscribe";
import {ApiError} from "../src/lib/server/http";
import {requestWithSession} from "../src/lib/session-request";
const wav=new File([new TextEncoder().encode("RIFF0000WAVEfmt ")],"speech.wav",{type:"audio/wav"});
test("voice upload rejects empty, oversized, unsupported and disguised files",async()=>{
 assert.ok(audioFileError({size:0,name:"a.wav",type:"audio/wav"}));assert.ok(audioFileError({size:4_000_001,name:"a.wav",type:"audio/wav"}));assert.ok(audioFileError({size:200,name:"a.exe",type:"audio/wav"}));
 await validateAudio(wav);await assert.rejects(()=>validateAudio(new File(["malicious content"],"a.wav",{type:"audio/wav"})),e=>e instanceof ApiError&&e.code==="AUDIO_INVALID");
});
test("SSE returns Vietnamese transcript across split UTF8/CRLF chunks and ignores heartbeat",async()=>{
 const b=new TextEncoder().encode('event: heartbeat\r\ndata: null\r\n\r\nevent: complete\r\ndata: ["Phân số và số thập phân", "metadata"]\r\n\r\n');
 const stream=new ReadableStream({start(c){for(let i=0;i<b.length;i+=3)c.enqueue(b.slice(i,i+3));c.close();}});
 assert.equal(await readTranscript(new Response(stream)),"Phân số và số thập phân");
});
test("SSE rejects empty, malformed, upstream and incomplete responses without leaking details",async()=>{
 for(const [body,code] of [['event: complete\ndata: ["", "info"]\n\n','VOICE_EMPTY'],['event: complete\ndata: {}\n\n','VOICE_FORMAT'],['event: error\ndata: "private traceback"\n\n','VOICE_UPSTREAM'],['event: heartbeat\ndata: null\n\n','VOICE_INCOMPLETE']])await assert.rejects(()=>readTranscript(new Response(body)),e=>e instanceof ApiError&&e.code===code&&!e.message.includes("private"));
});
test("VietScribe upload/call/SSE uses rnnlm and does not expose upstream metadata",async()=>{
 const original=global.fetch;let calls=0;
 try{global.fetch=async(url,init)=>{calls++;assert.ok(String(url).startsWith("https://leminhhung0101-vietscribe-ai.hf.space/gradio_api/"));if(calls===1){assert.ok(init?.body instanceof FormData);return Response.json(["/tmp/gradio/test/voice-note.wav"]);}if(calls===2){const b=JSON.parse(String(init?.body));assert.equal(b.data[1],"rnnlm");assert.equal(b.data[0].meta._type,"gradio.FileData");return Response.json({event_id:"abc123"});}return new Response('event: complete\ndata: ["Học về phân số", "private metadata"]\n\n');};assert.equal(await transcribeAudio(wav),"Học về phân số");assert.equal(calls,3);}finally{global.fetch=original;}
});
test("multipart session requests preserve browser boundary and retry only expired auth",async()=>{
 const form=new FormData();form.append("audio",wav);const user={uid:"voice-user",getIdToken:async(f?:boolean)=>f?"fresh":"old"};let count=0;
 const result=await requestWithSession<{transcript:string}>("/api/transcribe",{method:"POST",body:form},{currentUser:()=>user,fetch:async(_u,init)=>{const h=new Headers(init?.headers);assert.equal(h.has("Content-Type"),false);assert.equal(init?.body,form);count++;assert.equal(h.get("Authorization"),"Bearer "+(count===1?"old":"fresh"));return count===1?Response.json({code:"TOKEN_EXPIRED"},{status:401}):Response.json({transcript:"Nội dung bài học"});}});
 assert.equal(result.transcript,"Nội dung bài học");assert.equal(count,2);
});
test("Hugging Face ZeroGPU quota errors map to a distinct safe 429",async()=>{await assert.rejects(()=>readTranscript(new Response('event: error\ndata: {"error":"You have exceeded your ZeroGPU runs limit. Authenticate with a Hugging Face token"}\n\n')),e=>e instanceof ApiError&&e.status===429&&e.code==="VOICE_QUOTA");});
