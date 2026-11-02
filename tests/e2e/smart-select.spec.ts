import {test,expect} from "@playwright/test";
for(const width of [320,390,760,1280]){
 test("Professional dropdowns are usable at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/app?mode=demo&view=library");
  const grade=page.getByRole("button",{name:"Lớp học",exact:true});
  await expect(grade).toBeVisible();
  await grade.click();
  const list=page.getByRole("listbox",{name:"Lớp học"});
  await expect(list).toBeVisible();
  await expect(page.getByRole("option",{name:"Tất cả lớp"})).toHaveAttribute("aria-selected","true");
  const sheet=page.locator(".smart-select-menu");
  await expect(sheet).toBeVisible();
  const bounds=await sheet.boundingBox();
  expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+2);
  if(width<=760)expect(bounds!.y+bounds!.height).toBeGreaterThan(680);
  await page.getByRole("option",{name:"Lớp 8"}).click();
  await expect(grade).toContainText("Lớp 8");
  await expect(list).toHaveCount(0);
  await expect(page.locator(".note-card")).toContainText("Hằng đẳng thức");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
 });
}
test("Dropdown sheet supports keyboard controls and Escape",async({page})=>{
 await page.goto("/app?mode=demo&view=library");
 const grade=page.getByRole("button",{name:"Lớp học"});
 await grade.focus();await page.keyboard.press("ArrowDown");
 await expect(page.getByRole("listbox",{name:"Lớp học"})).toBeVisible();
 await page.keyboard.press("ArrowDown");
 await page.keyboard.press("Enter");
 await expect(grade).toContainText("Lớp 6");
 await grade.click();
 await page.keyboard.press("Escape");
 await expect(page.getByRole("listbox",{name:"Lớp học"})).toHaveCount(0);
});
test("Adding a lesson uses same grade selector",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=scan");
 await page.getByRole("button",{name:"Lớp của bài học"}).click();
 await expect(page.getByRole("listbox",{name:"Lớp của bài học"})).toBeVisible();
 await page.getByRole("option",{name:"Lớp 9"}).click();
 await expect(page.getByRole("button",{name:"Lớp của bài học"})).toContainText("Lớp 9");
});
test("Workout difficulty uses the same sheet",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=fitness");
 await page.getByRole("button",{name:"Lọc độ khó"}).click();
 await page.getByRole("option",{name:"Dễ",exact:true}).click();
 await expect(page.getByRole("button",{name:"Lọc độ khó"})).toContainText("Dễ");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});
