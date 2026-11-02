import {test,expect} from "@playwright/test";

for(const width of [320,390,760,1280]){
 test("3D switch controls faint water collisions and animated orange logo at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".water-atmosphere")).toHaveCount(1);
  await expect(page.locator(".water-drop")).toHaveCount(10);
  await expect(page.locator("html")).toHaveAttribute("data-motion","on");
  const logo=page.locator(".landing-nav .brand-icon");
  await expect(logo).toBeVisible();
  const initial=await logo.evaluate(el=>getComputedStyle(el).animationName);
  expect(initial).toContain("smart-logo-float");
  await page.getByRole("button",{name:"Tắt chuyển động 3D"}).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await expect(page.locator(".water-atmosphere")).toHaveCount(0);
  expect(await logo.evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button",{name:"Bật chuyển động 3D"}).click();
  await expect(page.locator(".water-atmosphere")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
 });
}
test("Water ambience switches translucency with dark/light palettes",async({page})=>{
 await page.goto("/");
 const root=page.locator("html");
 await expect(root).toHaveAttribute("data-theme",/light|dark/);
 const sample=()=>root.evaluate(el=>({theme:el.dataset.theme,opacity:getComputedStyle(el).getPropertyValue("--water-opacity").trim()}));
 const first=await sample();
 await page.getByRole("button",{name:first.theme==="light"?"Chuyển sang giao diện tối":"Chuyển sang giao diện sáng"}).click();
 const next=await sample();
 expect(next.theme).not.toBe(first.theme);
 expect(next.opacity).not.toBe(first.opacity);
 await expect(page.locator(".water-atmosphere")).toHaveCount(1);
});
test("3D switch remains visible on compact mobile app",async({page})=>{
 await page.setViewportSize({width:320,height:760});
 await page.goto("/app?mode=demo&view=home");
 const off=page.getByRole("button",{name:"Tắt chuyển động 3D"});
 await expect(off).toBeVisible();
 await off.click();
 await expect(page.locator(".water-atmosphere")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Bật chuyển động 3D"})).toBeVisible();
});
test("Respects system reduced-motion preference",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 await expect(page.locator("html")).toHaveAttribute("data-motion","off");
 await expect(page.locator(".water-atmosphere")).toHaveCount(0);
 expect(await page.locator(".landing-nav .brand-icon").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
});
