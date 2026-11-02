import {test,expect} from "@playwright/test";

for(const width of [320,390,760,1280]){
 test("Liquid collision physics + extruded 3D orange logo at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion","on");
  await expect(page.locator(".water-atmosphere[data-renderer='canvas-physics']")).toHaveCount(1);
  const canvas=page.locator(".liquid-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>{
   if(!c.width||!c.height)return false;
   const ctx=c.getContext("2d");if(!ctx)return false;
   const pixels=ctx.getImageData(0,0,c.width,c.height).data;
   // Sparse sampling: an animated, translucent raster must have visible alpha.
   for(let i=3;i<pixels.length;i+=4*73)if(pixels[i]>5)return true;
   return false;
  }),{timeout:5000}).toBe(true);
  const logo=page.locator(".landing-nav .brand-icon");
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(el=>getComputedStyle(el).animationName)).toContain("liquid-logo-orbit");
  await page.getByRole("button",{name:"Tắt chuyển động 3D"}).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await expect(page.locator(".water-atmosphere")).toHaveCount(0);
  expect(await logo.evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button",{name:"Bật chuyển động 3D"}).click();
  await expect(page.locator(".liquid-canvas")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
 });
}
test("Liquid shading adapts automatically to dark and light modes",async({page})=>{
 await page.goto("/");
 const root=page.locator("html");
 await expect(root).toHaveAttribute("data-theme",/light|dark/);
 const sample=()=>root.evaluate(el=>({theme:el.dataset.theme,opacity:getComputedStyle(el).getPropertyValue("--water-opacity").trim()}));
 const first=await sample();
 await page.getByRole("button",{name:first.theme==="light"?"Chuyển sang giao diện tối":"Chuyển sang giao diện sáng"}).click();
 const next=await sample();
 expect(next.theme).not.toBe(first.theme);
 expect(next.opacity).not.toBe(first.opacity);
 await expect(page.locator(".liquid-canvas")).toBeVisible();
});
test("3D switch is accessible in the phone header at 320px",async({page})=>{
 await page.setViewportSize({width:320,height:760});
 await page.goto("/app?mode=demo&view=home");
 const off=page.getByRole("button",{name:"Tắt chuyển động 3D"});
 await expect(off).toBeVisible();
 await off.click();
 await expect(page.locator(".liquid-canvas")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Bật chuyển động 3D"})).toBeVisible();
});
test("Reduced-motion preference disables canvas physics and logo animation",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 await expect(page.locator("html")).toHaveAttribute("data-motion","off");
 await expect(page.locator(".liquid-canvas")).toHaveCount(0);
 expect(await page.locator(".landing-nav .brand-icon").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
});
