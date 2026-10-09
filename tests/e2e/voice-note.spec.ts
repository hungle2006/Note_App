import {test,expect} from "@playwright/test";
test("voice transcript is reviewable, classified and saved through the regular library flow",async({page})=>{
 await page.goto('/app?mode=demo&view=scan');await page.getByRole('button',{name:'Giọng nói Ghi âm hoặc tải file'}).click();
 await expect(page.getByRole('heading',{name:'Nói để ghi nhớ'})).toBeVisible();
 await page.getByLabel('Nội dung nhận dạng — em có thể sửa lại').fill('Phân số biểu thị một phần của đơn vị. Ví dụ một phần hai là một trong hai phần bằng nhau.');
 await page.getByLabel('Môn học gợi ý',{exact:true}).fill('Toán học');await page.getByRole('button',{name:'Tạo bài từ bản chép lời'}).click();
 await page.getByLabel('Tên bài học',{exact:true}).fill('Bài học từ giọng nói');await page.getByLabel('Chương / chủ đề',{exact:true}).fill('Phân số');
 await page.getByRole('button',{name:'Lưu vào thư viện'}).click();await expect(page.getByRole('heading',{level:1})).toContainText('Bài học từ giọng nói');
 await page.reload();await page.goto('/app?mode=demo&view=library');await page.getByRole('textbox',{name:'Tìm bài học',exact:true}).fill('Bài học từ giọng nói');await expect(page.locator('.note-card')).toHaveCount(1);
});
test("voice file requires consent, demo never transcribes, and oversized files are rejected",async({page})=>{
 let calls=0;await page.route('**/api/transcribe',route=>{calls++;return route.abort();});await page.goto('/app?mode=demo&view=scan');await page.getByRole('button',{name:'Giọng nói Ghi âm hoặc tải file'}).click();
 const picker=page.getByLabel('File âm thanh');await picker.setInputFiles({name:'speech.wav',mimeType:'audio/wav',buffer:Buffer.from('RIFF0000WAVEfmt ')});
 const button=page.getByRole('button',{name:'Nhận dạng & tạo bản ghi'});await expect(button).toBeDisabled();await page.getByRole('checkbox').check();await button.click();await expect(page.locator('.voice-main [role=alert]')).toContainText('Bản mẫu không gửi âm thanh');expect(calls).toBe(0);
 await picker.setInputFiles({name:'long.wav',mimeType:'audio/wav',buffer:Buffer.alloc(4_000_001)});await expect(page.locator('.voice-main [role=alert]')).toContainText('vượt 4 MB');
});
test("microphone rejection is recoverable without opening a recording",async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))},configurable:true});});
 await page.goto('/app?mode=demo&view=scan');await page.getByRole('button',{name:'Giọng nói Ghi âm hoặc tải file'}).click();await page.getByRole('button',{name:'Ghi âm',exact:true}).click();await expect(page.locator('.voice-main [role=alert]')).toContainText('chưa cấp quyền micro');await expect(page.getByRole('button',{name:'Tải âm thanh'})).toBeEnabled();
});
test("voice capture fits narrow screens and cleans up a recording when leaving",async({page})=>{
 await page.addInitScript(()=>{const w=window as typeof window&{voiceStopped:number};w.voiceStopped=0;Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>{w.voiceStopped++;}}]})},configurable:true});class FakeRecorder{state='inactive';mimeType='audio/webm';onstop:(()=>void)|null=null;ondataavailable:((e:{data:Blob})=>void)|null=null;onerror=null;static isTypeSupported(){return true;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([26,69,223,163,0,0])],{type:'audio/webm'})});this.onstop?.();}}Object.defineProperty(window,'MediaRecorder',{value:FakeRecorder,configurable:true});});
 await page.setViewportSize({width:320,height:900});await page.goto('/app?mode=demo&view=scan');await page.getByRole('button',{name:'Giọng nói Ghi âm hoặc tải file'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Ghi âm',exact:true}).click();await expect(page.getByRole('button',{name:'Dừng ghi âm'})).toBeVisible();await page.getByRole('button',{name:'Chụp vở Nhận diện bằng Gemini'}).click();expect(await page.evaluate(()=>(window as typeof window&{voiceStopped:number}).voiceStopped)).toBeGreaterThan(0);
});
