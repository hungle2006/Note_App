/**
 * Groq commonly emits LaTeX with \[...\] and \(...\) delimiters.
 * remark-math recognizes dollar delimiters; normalize only prose segments.
 * Fenced and inline code stay intact to avoid modifying examples.
 */
export function normalizeMathDelimiters(input:string){
 return input.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((chunk,index)=>{
  if(index%2)return chunk;
  return chunk.replace(/(?<!\\)\\\[([\s\S]*?)\\\]/g,(_all,body:string)=>'\n$$\n'+body.trim()+'\n$$\n')
              .replace(/(?<!\\)\\\(([\s\S]*?)\\\)/g,(_all,body:string)=>'$'+body.trim()+'$');
 }).join('');
}
