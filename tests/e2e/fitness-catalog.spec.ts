import {test,expect} from "@playwright/test";
for(const width of [320,375,390,430,760]){
 test("Explore 100 workouts and guided routines at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/app?mode=demo&view=fitness");
  await expect(page.getByRole("heading",{name:/100 bài vận động/})).toBeVisible();
  await expect(page.getByText("100", {exact:true}).first()).toBeVisible();
  await expect(page.getByRole("searchbox",{name:"Tìm bài tập"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Squat/}).first()).toBeVisible();
  const nav=page.getByRole("group",{name:"Nhóm bài tập"});
  await page.getByRole("searchbox",{name:"Tìm bài tập"}).fill("tho bung");
  await expect(page.getByRole("button",{name:/Thở bụng chậm/})).toBeVisible();
  await page.getByRole("button",{name:/Thở bụng chậm/}).click();
  await expect(page.getByRole("heading",{name:/Đồng hồ hướng dẫn/})).toBeVisible();
  await expect(page.getByText("Không dùng camera, không giả lập AI đếm động tác")).toBeVisible();
  await expect(page.getByRole("region",{name:"Camera thật"})).toHaveCount(0);
  await page.getByRole("button",{name:/Bắt đầu tính giờ/}).click();
  await expect(page.getByRole("button",{name:"Tạm dừng"})).toBeVisible();
  await page.getByRole("button",{name:"Tạm dừng"}).click();
  await expect(page.getByRole("button",{name:/Tiếp tục/})).toBeVisible();
  await page.getByRole("searchbox",{name:"Tìm bài tập"}).fill("");
  await page.getByRole("button",{name:/AI đếm/}).first().click();
  await expect(page.getByText("7 bài phù hợp")).toBeVisible();
  await page.getByRole("button",{name:/Squat/}).first().click();
  await expect(page.getByRole("region",{name:"Camera thật"})).toBeVisible();
  await expect(page.getByRole("region",{name:"Bộ khung AI độc lập"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
 });
}
test("Search and difficulty filter do not label guided workouts as AI",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo&view=fitness");
 await page.getByRole("combobox",{name:"Lọc độ khó"}).selectOption("Dễ");
 await page.getByRole("button",{name:/Giãn cơ/}).first().click();
 await expect(page.getByText(/\d+ bài phù hợp/)).toBeVisible();
 await expect(page.locator("button[aria-pressed]")).not.toHaveCount(0);
 await page.getByRole("searchbox",{name:"Tìm bài tập"}).fill("zzzznotexist");
 await expect(page.getByText("Chưa có bài phù hợp")).toBeVisible();
 await page.getByRole("button",{name:"Xóa bộ lọc"}).click();
 await expect(page.getByText("100 bài phù hợp")).toBeVisible();
});
