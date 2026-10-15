import type {Note,NoteInput,ReviewIssue,ReferenceCheck,OcrEvaluation} from './schemas';
export const issueLabels:Record<ReviewIssue['kind'],string>={word:'Chữ khó đọc',formula:'Công thức',number:'Số liệu',unit:'Đơn vị',missing:'Có thể bỏ sót'};
export function needsReview(note:Pick<NoteInput,'review'>){return Boolean(note.review&&!note.review.confirmed);}
export function createReview(source:'image'|'voice',text:string,issues:ReviewIssue[]=[],uncertain:string[]=[]):NonNullable<NoteInput['review']>{
 const actual=issues.filter(i=>text.includes(i.quote));
 if(text.includes('[không rõ]')&&!actual.some(i=>i.quote==='[không rõ]'))actual.push({quote:'[không rõ]',reason:'Cần đối chiếu ảnh hoặc hỏi lại thầy cô.',kind:'missing',page:1});
 if(!actual.length&&uncertain.length)actual.push({quote:text.slice(0,120),reason:uncertain.join(' · ').slice(0,500),kind:'word',page:1});
 return {source,originalText:text,issues:actual.slice(0,30),confirmed:false};
}
// Model output is a proposal. Only exact evidence in BOTH user-supplied sources can support it.
export function groundReferenceChecks(checks:ReferenceCheck[],content:string,excerpt:string):ReferenceCheck[]{
 return checks.filter(c=>content.includes(c.quote)).map(c=>{
  if(c.status==='ask_teacher'||!c.sourceQuote.trim()||!excerpt.includes(c.sourceQuote))return {...c,status:'ask_teacher',sourceQuote:'',suggestion:'',reason:'Chưa có đoạn nguồn khớp để kết luận. Nên hỏi lại thầy cô. '+c.reason.slice(0,500)};
  if(c.status==='suggestion'&&!c.suggestion.trim())return {...c,status:'ask_teacher',suggestion:'',reason:'Chưa đủ căn cứ để đề xuất sửa. Nên hỏi lại thầy cô.'};
  return c;
 });
}
export function sensitiveSegments(text:string,issues:ReviewIssue[]){
 const ranges:{start:number;end:number;reason:string;kind:string}[]=[];
 for(const i of issues){let from=0,count=0;while(count++<40){const start=text.indexOf(i.quote,from);if(start<0)break;ranges.push({start,end:start+i.quote.length,reason:i.reason,kind:i.kind});from=start+i.quote.length;}}
 const regex=/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\[không rõ\]|\b\d+(?:[.,/]\d+)*(?:\s*(?:km\/h|m\/s|cm|mm|km|kg|mg|ml|m²|m³|°C|%))?/gu;
 for(const m of text.matchAll(regex))ranges.push({start:m.index!,end:m.index!+m[0].length,kind:'sensitive',reason:'Số, đơn vị hoặc công thức: cần so lại với bản gốc. Đây không phải dự đoán độ tin cậy của AI.'});
 const sorted=ranges.sort((a,b)=>a.start-b.start||b.end-a.end),parts:{text:string;reason?:string;kind?:string}[]=[];let cursor=0;
 for(const r of sorted){if(r.start<cursor)continue;if(r.start>cursor)parts.push({text:text.slice(cursor,r.start)});parts.push({text:text.slice(r.start,r.end),reason:r.reason,kind:r.kind});cursor=r.end;}
 if(cursor<text.length)parts.push({text:text.slice(cursor)});return parts;
}
function normalize(text:string){return Array.from(text.normalize('NFC').replace(/\s+/gu,' ').trim());}
export function characterErrorRate(expected:string,actual:string){
 const a=normalize(expected),b=normalize(actual);if(!a.length)return null;
 // Prevent accidental quadratic work on very large pasted pages; report no metric instead of truncating silently.
 if(a.length*b.length>4_000_000)return null;
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
 return {edits:row[b.length],characters:a.length,rate:row[b.length]/a.length};
}
export type EvaluationNote={id:string;title:string;review?:{evaluations?:OcrEvaluation[]}};
export function evaluationRows(notes:EvaluationNote[]){return notes.flatMap(n=>(n.review?.evaluations||[]).map(e=>({...e,noteId:n.id,title:n.title,metric:characterErrorRate(e.expectedText,e.ocrText)})));}
export function evaluationCsv(rows:ReturnType<typeof evaluationRows>){const escape=(s:unknown)=>'"'+String(s??'').replace(/"/g,'""')+'"';const data=[['Bài','Trang','Mã người viết','Điều kiện','Đọc sai (nhập tay)','Bỏ sót (nhập tay)','Sửa sai (nhập tay)','CER','Số phép sửa ký tự'],...rows.map(r=>[r.title,r.page,r.writer,r.condition,r.wrong,r.missing,r.falseCorrections,r.metric?.rate,r.metric?.edits])];return '\uFEFF'+data.map(r=>r.map(escape).join(',')).join('\r\n');}
export function mergeEvaluation(note:Note,evaluation:OcrEvaluation):NoteInput{
 return {...note,review:{...(note.review||{source:'manual' as const,originalText:note.content,issues:[],confirmed:true}),evaluations:[...(note.review?.evaluations||[]).filter(e=>e.page!==evaluation.page),evaluation].sort((a,b)=>a.page-b.page)}};
}
