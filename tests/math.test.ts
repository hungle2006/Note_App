import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMathDelimiters} from '../src/lib/math';
test('Groq bracketed LaTeX becomes display math',()=>{
 const src=String.raw`Vậy:\n\[ \frac{7832}{4738}+\frac{78234}{4783}=\frac{204,066,574}{11,330,927} \]`;
 const out=normalizeMathDelimiters(src);
 assert.match(out,/\$\$\s*\\frac\{7832\}/);
 assert.match(out,/\\frac\{204,066,574\}\{11,330,927\}\s*\$\$/);
});
test('Groq parenthesized inline math, aligned blocks and roots',()=>{
 assert.equal(normalizeMathDelimiters(String.raw`Giải \(x^2=\sqrt{2}\).`),'Giải $x^2=\\sqrt{2}$.');
 assert.match(normalizeMathDelimiters(String.raw`\[\begin{aligned} a&=b+c\\d&=e+f\end{aligned}\]`),/\$\$[\s\S]*\\begin\{aligned\}/);
});
test('math delimiters in code samples stay literal',()=>{
 const src=String.raw`Ví dụ: \`\[x\]\`\n\`\`\`latex\n\[y\]\n\`\`\``;
 assert.equal(normalizeMathDelimiters(src),src);
});

test('rendered tutor response contains KaTeX instead of raw TeX markers',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {Markdown}=await import('../src/components/ui');
 const html=renderToStaticMarkup(createElement(Markdown,{content:String.raw`Vậy: \[\frac{1}{2}+\frac{1}{3}=\frac{5}{6}\]`}));
 assert.match(html,/katex/);
 assert.match(html,/katex-display/);
 assert.doesNotMatch(html,/\\\\\[/);
});
