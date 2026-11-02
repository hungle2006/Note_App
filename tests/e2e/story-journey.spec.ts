import {test,expect} from "@playwright/test";

const widths=[320,375,390,430,760,1024,1440];

for(const width of widths){
 test("Story journey works on "+width+"px from first visit",async({page})=>{
  await page.setViewportSize({width,height:880});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Tò mò hôm nay/})).toBeVisible();
  const journey=page.getByRole("region",{name:"Hành trình SmartNotes gồm 7 chặng"});
  await expect(journey).toBeVisible();
  await expect(journey.locator(".story-step")).toHaveCount(7);
  await expect(page.getByRole("link",{name:/Vận động vui/})).toBeVisible();
  const box=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  expect(box.scroll).toBeLessThanOrEqual(box.width+2);
  await journey.locator('.story-step[href*="view=fitness"]').click();
  await expect(page).toHaveURL(/view=fitness/);
  await expect(page.getByRole("region",{name:/Chương hành trình: Nạp năng lượng/})).toBeVisible();
  const w=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
 });
}
for(const view of ["scan","library","chat","games","fitness","rewards","quality","settings"]){
 test("Every task joins one story: "+view,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/app?mode=demo&view="+view);
  const chapter=page.locator(".story-chapter");
  await expect(chapter).toHaveCount(1);
  await expect(chapter).toBeVisible();
  await expect(chapter.locator(".story-chapter-icon svg")).toHaveCount(1);
  const pos=await page.evaluate(()=>{
   const a=document.querySelector(".story-chapter")!.getBoundingClientRect();
   return {left:a.left,right:a.right,screen:innerWidth,scroll:document.documentElement.scrollWidth};
  });
  expect(pos.left).toBeGreaterThanOrEqual(0);
  expect(pos.right).toBeLessThanOrEqual(pos.screen+1);
  expect(pos.scroll).toBeLessThanOrEqual(pos.screen+2);
 });
}
test("Next chapter is a working navigation control",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=scan");
 await page.getByRole("button",{name:"Đi tới chặng tiếp theo: Gom thành kho báu"}).click();
 await expect(page).toHaveURL(/view=library/);
 await expect(page.getByRole("region",{name:/Chương hành trình: Gom thành kho báu/})).toBeVisible();
});
test("Dashboard story path is interactive and compact",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=home");
 const path=page.getByRole("region",{name:"Hành trình SmartNotes gồm 7 chặng"});
 await expect(path).toBeVisible();
 await expect(path.locator(".story-step")).toHaveCount(7);
 await path.getByRole("button",{name:/Chơi để nhớ lâu/}).click();
 await expect(page).toHaveURL(/view=games/);
});
