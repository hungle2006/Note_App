import { z } from "zod";
const label=z.string().trim().min(1).max(160);
export const idSchema=z.string().uuid();
export const gradeSchema=z.number().int().min(6).max(9);
export const imageSchema=z.object({name:z.string().max(200),dataUrl:z.string().max(1500000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)});
export const noteInputSchema=z.object({
 title:label,subject:label,chapter:label,grade:gradeSchema.default(6),content:z.string().trim().min(10).max(40000),
 summary:z.string().max(6000).default(""),tags:z.array(z.string().trim().min(1).max(60)).max(12).default([]),
 images:z.array(imageSchema).max(3).default([])
}).refine(v=>v.images.reduce((n,x)=>n+x.dataUrl.length,0)<=2400000,"Tổng ảnh quá lớn.");
export type NoteInput=z.infer<typeof noteInputSchema>;
export type Note=NoteInput & {id:string;createdAt:string;updatedAt:string;study?:StudySet};
export const extractionSchema=z.object({title:label,subject:label,chapter:label,content:z.string().min(10).max(40000),summary:z.string().max(6000),tags:z.array(z.string().max(60)).max(12),uncertain:z.array(z.string().max(500)).max(20)});
export type Extraction=z.infer<typeof extractionSchema>;
export const studySchema=z.object({
 flashcards:z.array(z.object({question:z.string().min(1).max(1000),answer:z.string().min(1).max(2000)})).min(4).max(12),
 quiz:z.array(z.object({question:z.string().min(1).max(1000),options:z.array(z.string().min(1).max(800)).length(4),answer:z.number().int().min(0).max(3),explanation:z.string().min(1).max(2000)})).min(4).max(10),
 pairs:z.array(z.object({term:z.string().min(1).max(200),definition:z.string().min(1).max(500)})).min(4).max(8)
});
export type StudySet=z.infer<typeof studySchema>;
export type Attempt={id:string;noteId:string;mode:"quiz"|"flashcards"|"match";score:number;total:number;createdAt:string;nextReviewAt:string};
export const attemptSchema=z.discriminatedUnion("mode",[
 z.object({noteId:idSchema,mode:z.literal("quiz"),answers:z.array(z.number().int().min(0).max(3)).min(4).max(10)}),
 z.object({noteId:idSchema,mode:z.literal("flashcards"),ratings:z.array(z.enum(["again","good","easy"])).min(4).max(12)}),
 z.object({noteId:idSchema,mode:z.literal("match"),matches:z.array(z.number().int().min(0).max(7)).min(4).max(8)})
]);
export function gradeAttempt(study:StudySet,input:z.infer<typeof attemptSchema>){
 const size=input.mode==="quiz"?study.quiz.length:input.mode==="match"?study.pairs.length:study.flashcards.length;
 const values=input.mode==="quiz"?input.answers:input.mode==="match"?input.matches:input.ratings;
 if(values.length!==size)throw new Error("Số câu trả lời không khớp bộ ôn tập.");
 const score=input.mode==="quiz"?input.answers.filter((a,i)=>a===study.quiz[i].answer).length:input.mode==="match"?input.matches.filter((a,i)=>a===i).length:input.ratings.filter(a=>a!=="again").length;
 const days=score/size<.6?1:score/size<.85?3:7;
 return {score,total:size,nextReviewAt:new Date(Date.now()+days*86400000).toISOString()};
}
