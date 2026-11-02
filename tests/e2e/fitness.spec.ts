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
 await expect(page.getByText("Chưa bật camera")).toBeVisible();
 await page.getByRole("button",{name:"Mở menu"}).click();
 await expect(page.getByRole("button",{name:/Tập thể dục AI/})).toBeVisible();
});


for(const width of [320,375,390,430,760]){
 test("Camera and animated pose are distinct, side-by-side at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=fitness");
  const videoPanel=page.getByRole("region",{name:"Camera thật"});
  const posePanel=page.getByRole("region",{name:"Bộ khung AI độc lập"});
  await expect(videoPanel).toBeVisible();
  await expect(posePanel).toBeVisible();
  await expect(videoPanel.locator("video")).toHaveCount(1);
  await expect(videoPanel.locator("canvas")).toHaveCount(0);
  await expect(posePanel.locator("video")).toHaveCount(0);
  await expect(posePanel.locator("canvas")).toHaveCount(1);
  const cameraBox=await videoPanel.boundingBox(),poseBox=await posePanel.boundingBox();
  expect(cameraBox).not.toBeNull();expect(poseBox).not.toBeNull();
  expect(poseBox!.x).toBeGreaterThan(cameraBox!.x+cameraBox!.width-2);
  expect(Math.abs(poseBox!.y-cameraBox!.y)).toBeLessThan(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  await page.getByRole("button",{name:/Đổi camera trước sau, hiện đang dùng camera trước/}).click();
  await expect(page.getByText("Camera sau",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Đổi camera trước sau, hiện đang dùng camera sau/})).toBeVisible();
  await page.getByRole("button",{name:/Đổi camera trước sau, hiện đang dùng camera sau/}).click();
  await expect(page.getByText("Camera trước",{exact:true})).toBeVisible();
 });
}
