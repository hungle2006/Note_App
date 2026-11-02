import {test,expect} from "@playwright/test";

const sizes=[
 {width:320,height:720},
 {width:375,height:812},
 {width:390,height:844},
 {width:768,height:1024}
];

for(const size of sizes){
 test("FitMotion responsive at "+size.width+"px",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize(size);
  await page.goto("/app?mode=demo&view=fitness");
  await expect(page.getByRole("heading",{name:/FitMotion/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Bật camera & bắt đầu/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Squat Đứng lên ngồi xuống/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Jumping Jack/})).toBeVisible();
  const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(width.document).toBeLessThanOrEqual(width.viewport+2);
  await page.getByRole("button",{name:/High Knees/}).click();
  await expect(page.getByText("Nâng gối trái/phải luân phiên",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/High Knees/})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:/Buổi tập mới/}).click();
  expect(errors).toEqual([]);
 });
}

test("FitMotion accessible from mobile navigation and dashboard",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo");
 await expect(page.getByRole("button",{name:/Bắt đầu tập/})).toBeVisible();
 await page.getByRole("button",{name:/Bắt đầu tập/}).click();
 await expect(page).toHaveURL(/view=fitness/);
 await expect(page.getByText("Camera đang tắt")).toBeVisible();
 await page.getByRole("button",{name:"Mở menu"}).click();
 await expect(page.getByRole("button",{name:/Tập thể dục AI/})).toBeVisible();
});
