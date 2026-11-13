/**
 * Normalize both TeX-delimiter formats commonly returned by Groq.
 * Markdown/math code examples remain unchanged.
 */
export function normalizeMathDelimiters(input:string){
 const mathBody=(body:string)=>body.trim().replace(/\\\\(frac|sqrt|begin|end|cdot|times|sum|int|left|right|text|mathrm|operatorname|pi|theta|alpha|beta|gamma|infty|leq|geq)\b/g,'\\$1');
 return input.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((chunk,index)=>{
  if(index%2)return chunk;
  return chunk.replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g,(_all,body:string)=>'\n\n$$\n'+mathBody(body)+'\n$$\n\n')
              .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g,(_all,body:string)=>'$'+mathBody(body)+'$');
 }).join('');
}
