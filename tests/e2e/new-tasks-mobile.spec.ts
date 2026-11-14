import {test,expect} from '@playwright/test';
for(const width of [320,390,430,760]){
 test(`new tasks fit and work at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  for(const view of ['checkin','solar','peers','settings']){
   await page.goto('/app?mode=demo&view='+view);
   await expect(page.locator('.workspace-content')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   if(view==='checkin'){
    await expect(page.locator('.attendance-day')).toHaveCount(7);
    await expect(page.locator('.attendance-overview-day')).toHaveCount(49);
    await page.getByRole('button',{name:/Điểm danh ·/}).click();
    await expect(page.getByRole('button',{name:'Đã điểm danh hôm nay'})).toBeDisabled();
   }
   if(view==='solar'){
    await page.getByRole('button',{name:'Trái Đất',exact:true}).click();
    await page.getByRole('button',{name:'Bài học & câu hỏi',exact:true}).click();
    await expect(page.locator('.planet-detail h2')).toHaveText('Trái Đất');
    await page.getByRole('button',{name:'Mô hình 3D',exact:true}).click();
    await page.getByRole('button',{name:'Phóng to khu vũ trụ toàn màn hình'}).click();
    await expect(page.locator('.solar-expanded')).toBeVisible();
    const box=await page.locator('.solar-expanded').boundingBox();
    expect(box!.width).toBe(width);expect(box!.height).toBe(844);
    await page.getByRole('button',{name:'Thu nhỏ khu vũ trụ'}).click();
    await expect(page.locator('.solar-expanded')).toHaveCount(0);
   }
   if(view==='settings'){
    await page.getByRole('spinbutton',{name:'Giá trị R',exact:true}).fill('40');
    await expect(page.locator('.color-controls [role=status]')).toContainText('Đang dùng màu');
    await page.getByRole('button',{name:'Màu mặc định'}).click();
    await expect(page.locator('.color-controls [role=status]')).toContainText('Đang dùng màu cam gốc');
   }
  }
 });
}
