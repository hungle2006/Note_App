import {test,expect} from "@playwright/test";

for(const width of [320,375,390,430,760]){
 test("iPhone fitness search/filter stay one line with their icons at "+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=fitness");
  await expect(page.getByRole("searchbox",{name:"Tìm bài tập"})).toBeVisible();
  const rects=await page.evaluate(()=>{
   const box=(node:Element|null)=>{if(!node)throw Error("Required element not found");const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2,right:r.right};};
   const search=document.querySelector('section[aria-label="Thư viện bài tập"] label:has(input[type=search])')!;
   const filter=document.querySelector('section[aria-label="Thư viện bài tập"] .fitness-smart-filter')!;
   return {search:box(search),icon:box(search?.querySelector("svg")),input:box(search?.querySelector("input")),filter:box(filter),filterIcon:box(filter?.querySelector(".smart-select-leading svg")),select:box(filter?.querySelector(".smart-select-trigger .smart-select-current")),w:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(rects.w).toBeLessThanOrEqual(rects.viewport+2);
  expect(rects.search.h).toBeLessThan(60);
  expect(rects.filter.h).toBeLessThan(60);
  expect(Math.abs(rects.icon.cy-rects.input.cy)).toBeLessThan(8);
  expect(Math.abs(rects.filterIcon.cy-rects.select.cy)).toBeLessThan(8);
  expect(rects.input.x).toBeGreaterThan(rects.icon.cx);
  expect(rects.select.x).toBeGreaterThan(rects.filterIcon.cx);
  expect(rects.search.right).toBeLessThanOrEqual(width+1);
  await page.getByRole("button",{name:"Lọc độ khó"}).click();
  await page.getByRole("option",{name:"Dễ",exact:true}).click();
  await expect(page.getByRole("button",{name:"Lọc độ khó"})).toContainText("Dễ");
  await page.getByRole("searchbox",{name:"Tìm bài tập"}).fill("gian co");
  await expect(page.getByText(/\d+ bài phù hợp/)).toBeVisible();
  await expect(page.locator('section[aria-label="Thư viện bài tập"] button[aria-pressed=true]').first()).toBeVisible();
 });
}
for(const width of [320,390,430]){
 test("student start screen has four reachable cards, no overlap at "+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Hôm nay mình khám phá gì?"})).toBeVisible();
  await expect(page.locator(".quickstart-card")).toHaveCount(4);
  const data=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll(".quickstart-card")];const boxes=nodes.map(n=>n.getBoundingClientRect());const a=document.querySelector(".landing-nav")!.getBoundingClientRect();
   return {navRight:a.right,boxes:boxes.map(b=>({x:b.x,y:b.y,right:b.right,bottom:b.bottom})),scroll:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(data.scroll).toBeLessThanOrEqual(width+2);
  expect(data.navRight).toBeLessThanOrEqual(width+2);
  for(let i=0;i<data.boxes.length;i++){const a=data.boxes[i];expect(a.x).toBeGreaterThanOrEqual(-1);expect(a.right).toBeLessThanOrEqual(width+2);for(let j=i+1;j<data.boxes.length;j++){const b=data.boxes[j];const shared=Math.min(a.right,b.right)-Math.max(a.x,b.x)>2 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>2;expect(shared).toBeFalsy();}}
  await page.getByRole("link",{name:/Vận động vui/}).click();
  await expect(page).toHaveURL(/view=fitness/);
  await expect(page.getByRole("heading",{name:/100 bài vận động/})).toBeVisible();
 });
}
test("menu overlay is above the bottom bar and closes cleanly on mobile",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=home");
 const nav=page.getByRole("navigation",{name:"Điều hướng nhanh trên điện thoại"});
 await expect(nav).toBeVisible();
 await page.getByRole("button",{name:"Mở tất cả chức năng"}).click();
 const menu=page.locator(".sidebar.mobile-open");
 await expect(menu).toBeVisible();
 const layers=await page.evaluate(()=>({
  side:Number.parseInt(getComputedStyle(document.querySelector(".sidebar")!).zIndex,10),
  bar:Number.parseInt(getComputedStyle(document.querySelector(".mobile-tabbar")!).zIndex,10),
  scrim:Number.parseInt(getComputedStyle(document.querySelector(".sidebar-scrim")!).zIndex,10)
 }));
 expect(layers.side).toBeGreaterThan(layers.scrim);
 expect(layers.scrim).toBeGreaterThan(layers.bar);
 await page.getByRole("button",{name:"Đóng menu"}).first().click();
 await expect(menu).toHaveCount(0);
 await expect(nav).toBeVisible();
});
