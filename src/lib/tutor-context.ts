import type {Note} from "./schemas";

export type TutorSource={noteId:string;title:string;subject:string;chapter:string;grade:number;reference:number;excerpt:string};
export type TutorMessage={role:"user"|"assistant";content:string;sources?:TutorSource[]};
export type TutorMode="explain"|"hint"|"practice";
export function foldText(text:string){return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");}
const stop=new Set("em minh toi ban oi hay la va cua cho voi mot nhung cac duoc dang nay do thi trong the nao gi khi de ve hoi giup giai thich tai sao lam bai hoc lop anh chi muon nhe".split(" "));
export function queryTerms(question:string){return [...new Set(foldText(question).match(/[a-z0-9]+/g)||[])].filter(t=>t.length>1&&!stop.has(t)).slice(0,12);}
export function noteSearchText(note:Pick<Note,"title"|"subject"|"chapter"|"summary"|"tags"|"content">){return foldText([note.title,note.subject,note.chapter,note.summary,...note.tags,note.content].join("\n"));}
function scoreText(text:string,terms:string[]){const words=new Set(foldText(text).match(/[a-z0-9]+/g)||[]);return terms.reduce((n,t)=>n+(words.has(t)?1:0),0);}
export function selectTutorSources(notes:Note[],question:string,{grade,noteId}:{grade?:number;noteId?:string}={}):TutorSource[]{
 const terms=queryTerms(question);
 const ranked=notes.filter(n=>noteId?n.id===noteId:!grade||n.grade===grade).map(n=>({note:n,score:scoreText(n.title,terms)*5+scoreText(n.subject+" "+n.chapter+" "+n.tags.join(" "),terms)*2+scoreText(n.content,terms)})).filter(r=>noteId||scoreText(noteSearchText(r.note),terms)>=Math.max(1,Math.ceil(terms.length*.6))).sort((a,b)=>b.score-a.score||b.note.updatedAt.localeCompare(a.note.updatedAt)).slice(0,4);
 let remaining=16000;
 return ranked.map(({note:n},i)=>{
  const chunks=n.content.split(/\n\s*\n/).flatMap(p=>p.length>1800?(p.match(/[\s\S]{1,1800}/g)||[]):[p]);
  const selected=chunks.map((text,index)=>({text,index,score:scoreText(text,terms)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,8);
  const budget=Math.min(6000,remaining);
  let used=0;const kept=selected.filter(x=>{if(used+x.text.length>budget)return false;used+=x.text.length;return true;}).sort((a,b)=>a.index-b.index);
  const excerpt=kept.map(x=>x.text).join("\n\n").slice(0,budget);
  remaining-=excerpt.length;
  return {noteId:n.id,title:n.title,subject:n.subject,chapter:n.chapter,grade:n.grade,reference:i+1,excerpt};
 }).filter(s=>s.excerpt.length>0);
}
