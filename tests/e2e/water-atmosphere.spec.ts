import {test,expect} from "@playwright/test";

for(const width of [320,390,760,1280]){
 test("Blender 3D soft-body droplets and logo at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion","on");
  await expect(page.locator(".water-atmosphere[data-effect='soft-body-water-3d']")).toHaveCount(1);
  await expect(page.locator(".water-atmosphere[data-renderer='webgl-blender-surface']")).toHaveCount(1);
  await expect(page.locator(".water-atmosphere")).toHaveAttribute("data-size-mix","large-medium-small");
  const canvas=page.locator(".liquid-canvas");
  await expect(page.locator(".water-drop, .water-pair, .water-bridge")).toHaveCount(0);
  const atmosphere=page.locator(".water-atmosphere");
  await expect(atmosphere).toHaveAttribute("data-mode",/webgl|fallback/);
  if(await atmosphere.getAttribute("data-mode")==="webgl"){
   await expect(canvas).toBeVisible();
   await expect(canvas).toHaveAttribute("data-surface","blender");
   await expect(canvas).toHaveAttribute("data-lenses",width<=760?"5":"7");
   const firstFrame=await canvas.getAttribute("data-frames");
   await expect.poll(()=>canvas.getAttribute("data-frames")).not.toBe(firstFrame);
  }else{
   const lens=page.locator(".peach-water-sprite").first();
   await expect(lens).toBeVisible();
   await expect.poll(()=>lens.locator("img").evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBe(512);
   const first=await lens.evaluate(el=>getComputedStyle(el).transform);
   await expect.poll(()=>lens.evaluate(el=>getComputedStyle(el).transform)).not.toBe(first);
   await expect(lens.locator('.water-surface')).toBeVisible();
   const displacement=page.locator('feDisplacementMap').first();
   const initial=await displacement.evaluate((el:SVGFEDisplacementMapElement)=>el.scale.animVal);
   await expect.poll(()=>displacement.evaluate((el:SVGFEDisplacementMapElement)=>el.scale.animVal)).not.toBe(initial);
  }
  const logo=page.locator(".landing-nav .brand-icon");
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
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
test("Independent droplet shading adapts to dark and light modes",async({page})=>{
 await page.goto("/");
 const root=page.locator("html");
 await expect(root).toHaveAttribute("data-theme",/light|dark/);
 const sample=()=>root.evaluate(el=>({theme:el.dataset.theme,opacity:getComputedStyle(el).getPropertyValue("--water-opacity").trim()}));
 const first=await sample();
 await page.getByRole("button",{name:first.theme==="light"?"Chuyển sang giao diện tối":"Chuyển sang giao diện sáng"}).click();
 const next=await sample();
 expect(next.theme).not.toBe(first.theme);
 expect(next.opacity).not.toBe(first.opacity);
 await expect(page.locator(".water-atmosphere")).toBeVisible();
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
test("Reduced-motion preference disables droplet motion and logo animation",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 await expect(page.locator("html")).toHaveAttribute("data-motion","off");
 await expect(page.locator(".liquid-canvas")).toHaveCount(0);
 expect(await page.locator(".landing-nav .brand-icon").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
});
