import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
test('visual review across themes and screens',async({page})=>{
 await mkdir('test-results/visual',{recursive:true});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.screenshot({path:'test-results/visual/landing-light.png',fullPage:true});
 await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();await page.screenshot({path:'test-results/visual/landing-dark.png',fullPage:true});
 await page.goto('/app?mode=demo');await expect(page.getByText('Bài học đã tải',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/visual/dashboard-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).click();await page.screenshot({path:'test-results/visual/dashboard-light.png',fullPage:true});
 await page.goto('/app?mode=demo&view=chat');await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.screenshot({path:'test-results/visual/tutor-light.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.screenshot({path:'test-results/visual/mobile-light.png',fullPage:true});
 expect(errors).toEqual([]);
});
