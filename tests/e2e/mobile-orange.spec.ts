import {test,expect} from "@playwright/test";

for(const width of [320,375,390,430,760]){
 test("Orange Pastel and navigation at "+width+"px",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=home");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  const tokens=await page.evaluate(()=>({background:getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),width:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(tokens.background).toBe("#fff9f3");
  expect(tokens.width).toBeLessThanOrEqual(tokens.viewport+2);
  await expect(page.getByRole("navigation",{name:"Điều hướng nhanh trên điện thoại"})).toBeVisible();
  await page.getByRole("navigation",{name:"Điều hướng nhanh trên điện thoại"}).getByRole("button",{name:"Điểm Nắng"}).click();
  await expect(page.getByRole("heading",{name:"Góc thành tích",exact:true})).toBeVisible();
  await expect(page).toHaveURL(/view=rewards/);
  await expect(page.locator(".sun-reward")).toHaveCount(6);
  await expect(page.getByRole("progressbar",{name:"Tiến độ lên cấp"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
 });
}
for(const view of ["home","library","scan","chat","games","fitness","rewards","quality","settings"]){
 test("Mobile structure and overflow: "+view,async({page})=>{
  await page.setViewportSize({width:320,height:812});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/app?mode=demo&view="+view);
  await expect(page.locator(".workspace-content")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Điều hướng nhanh trên điện thoại"})).toBeVisible();
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+2);
  expect(errors).toEqual([]);
 });
}
test("Mobile reward filter works",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=rewards");
 await expect(page.locator(".sun-reward")).toHaveCount(6);
 await page.getByRole("button",{name:/Đã sở hữu/}).click();
 await expect(page.locator(".sun-reward")).toHaveCount(0);
 await page.getByRole("group",{name:"Lọc huy hiệu"}).getByRole("button",{name:/^Tất cả/}).click();
 await expect(page.locator(".sun-reward")).toHaveCount(6);
 expect(await page.locator("body").innerText()).not.toContain("Bảng xếp hạng");
});


for(const width of [320,375,390,430,760]){
 test("Mobile dashboard hero illustration stays within its banner at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto("/app?mode=demo&view=home");
  const hero=page.locator(".dashboard-hero");
  const art=page.locator(".dashboard-hero .scene-blender");
  const text=page.locator(".dashboard-hero-copy");
  const action=page.locator(".dashboard-hero .button");
  await expect(hero).toBeVisible();
  await expect(art).toBeVisible();
  await expect(action).toBeVisible();
  const dims=await page.evaluate(()=>{
   const rect=(sel:string)=>{const b=document.querySelector(sel)?.getBoundingClientRect();if(!b)throw Error("Missing "+sel);return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
   return {hero:rect(".dashboard-hero"),copy:rect(".dashboard-hero-copy"),art:rect(".dashboard-hero .scene-blender"),action:rect(".dashboard-hero .button"),cta:rect(".fitness-home-cta"),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(dims.hero.height).toBeLessThan(440);
  expect(dims.art.x).toBeGreaterThanOrEqual(dims.hero.x-1);
  expect(dims.art.right).toBeLessThanOrEqual(dims.hero.right+1);
  expect(dims.art.y).toBeGreaterThanOrEqual(dims.copy.bottom-1);
  expect(dims.art.bottom).toBeLessThanOrEqual(dims.hero.bottom+1);
  expect(dims.action.right).toBeLessThanOrEqual(dims.hero.right+1);
  expect(dims.cta.y).toBeGreaterThanOrEqual(dims.hero.bottom);
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.viewport+2);
 });
}


for(const width of [320,375,390,430]){
 test("Mobile fitness search and dropdown remain inline without clipping at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=fitness");
  const search=page.getByRole("searchbox",{name:"Tìm bài tập"});
  const select=page.getByRole("button",{name:"Lọc độ khó"});
  await expect(search).toBeVisible();
  await expect(select).toBeVisible();
  const boxes=await Promise.all([search.boundingBox(),select.boundingBox()]);
  expect(boxes[0]).not.toBeNull();expect(boxes[1]).not.toBeNull();
  expect(boxes[0]!.height).toBeLessThanOrEqual(55);
  expect(boxes[1]!.height).toBeLessThanOrEqual(55);
  expect(boxes[0]!.x).toBeGreaterThanOrEqual(0);
  expect(boxes[0]!.x+boxes[0]!.width).toBeLessThanOrEqual(width);
  expect(boxes[1]!.x+boxes[1]!.width).toBeLessThanOrEqual(width);
  const searchIcon=await page.locator('label:has(input[aria-label="Tìm bài tập"])>svg').boundingBox();
  expect(searchIcon).not.toBeNull();
  expect(Math.abs((searchIcon!.y+searchIcon!.height/2)-(boxes[0]!.y+boxes[0]!.height/2))).toBeLessThan(8);
  await search.fill("gian co");
  await expect(page.getByText(/\d+ bài phù hợp/)).toBeVisible();
  await select.click();
  await page.getByRole("option",{name:"Dễ",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
 });
}
