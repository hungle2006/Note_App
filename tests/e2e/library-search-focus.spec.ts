import {test,expect} from "@playwright/test";

for(const width of [320,390,430,760,1280]){
 test("Library search displays only a single focus ring and aligned icon at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=library");
  const input=page.getByRole("textbox",{name:"Tìm bài học"});
  await expect(input).toBeVisible();
  await input.focus();
  const metrics=await page.evaluate(()=>{
   const wrap=document.querySelector<HTMLElement>(".library-filters .search-input")!;
   const input=wrap.querySelector<HTMLInputElement>("input")!;
   const icon=wrap.querySelector<SVGElement>("svg")!;
   const w=wrap.getBoundingClientRect(),i=input.getBoundingClientRect(),s=icon.getBoundingClientRect();
   const css=getComputedStyle(input),focus=getComputedStyle(w);
   return {
    inputBorderTop:css.borderTopWidth,inputOutline:css.outlineStyle,inputShadow:css.boxShadow,
    border:focus.borderTopWidth,shadow:focus.boxShadow,
    outerHeight:w.height,innerHeight:i.height,
    centersDiff:Math.abs((i.top+i.bottom)/2-(s.top+s.bottom)/2),
    leftGap:i.left-s.right,within:i.left>=w.left&&i.right<=w.right,
    overflow:document.documentElement.scrollWidth-innerWidth
   };
  });
  expect(metrics.inputBorderTop).toBe("0px");
  expect(metrics.inputOutline).toBe("none");
  expect(metrics.inputShadow).toBe("none");
  expect(metrics.border).toBe("1px");
  expect(metrics.shadow).not.toBe("none");
  expect(metrics.outerHeight).toBe(48);
  expect(metrics.centersDiff).toBeLessThan(3);
  expect(metrics.leftGap).toBeGreaterThanOrEqual(7);
  expect(metrics.within).toBe(true);
  expect(metrics.overflow).toBeLessThanOrEqual(2);
 });
}
