import {test,expect} from "@playwright/test";
import {demoNotes,sampleStudy} from "../../src/lib/demo";
const noteId=demoNotes[0].id;
test("landing opens an honest demo",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toContainText("Kiến thức trong vở");
 await page.getByRole("link",{name:"Khám phá bản mẫu"}).click();
 await expect(page.getByText("Không gian mẫu",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("Bài học đã tải",{exact:true})).toBeVisible();
});
test("registration has full fields and requires configuration",async({page})=>{
 await page.goto("/register");
 for(const name of ["Họ và tên","Email","Xác nhận mật khẩu"])await expect(page.getByLabel(name,{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tạo tài khoản",exact:true})).toBeDisabled();
 await expect(page.getByText("Dịch vụ tài khoản chưa được kết nối.")).toBeVisible();
});
test("library searches without Vietnamese accents",async({page})=>{
 await page.goto("/app?mode=demo&view=library");
 await page.getByRole("textbox",{name:"Tìm bài học",exact:true}).fill("nhi thuc");
 await expect(page.locator(".note-card")).toHaveCount(1);
 await page.locator(".note-card").click();
 await expect(page.getByRole("heading",{level:1})).toContainText("Phân phối nhị thức");
 await expect(page.locator(".katex").first()).toBeVisible();
});
test("manual note persists and deletion removes it",async({page})=>{
 await page.goto("/app?mode=demo&view=scan");
 await page.getByRole("button",{name:"Tự viết bài mới"}).click();
 await page.getByLabel("Tên bài học",{exact:true}).fill("Bài kiểm tra lưu");
 await page.getByLabel("Môn học",{exact:true}).fill("Toán");
 await page.getByLabel("Chương / chủ đề").fill("Đại số");
 await page.getByLabel("Nội dung bài học",{exact:true}).fill("Nội dung kiểm thử được lưu trên trình duyệt.");
 await page.getByRole("button",{name:"Lưu vào thư viện"}).click();
 await expect(page.getByRole("heading",{level:1})).toHaveText("Bài kiểm tra lưu");
 await page.reload();
 await expect(page.getByRole("heading",{level:1})).toHaveText("Bài kiểm tra lưu");
 await page.getByRole("button",{name:"Xóa bài học",exact:true}).click();
 await expect(page.getByRole("dialog")).toBeVisible();
 await page.getByRole("dialog").getByRole("button",{name:"Xóa bài học",exact:true}).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.reload();
 await expect(page.locator(".note-card").filter({hasText:"Bài kiểm tra lưu"})).toHaveCount(0);
});
test("edited source invalidates study set",async({page})=>{
 await page.goto("/app?mode=demo&view=detail&note="+noteId);
 await page.getByRole("button",{name:"Chỉnh sửa bài học"}).click();
 await page.getByLabel("Tên bài học",{exact:true}).fill("Phân phối nhị thức cập nhật");
 await page.getByRole("button",{name:"Lưu vào thư viện"}).click();
 await page.getByRole("button",{name:/Tạo một lượt ôn tập/}).click();
 await expect(page.getByRole("button",{name:"Tạo bộ ôn tập",exact:true})).toBeVisible();
});
test("quiz completes, grades and persists attempt",async({page})=>{
 await page.goto("/app?mode=demo&view=games&note="+noteId);
 await page.getByRole("button",{name:/Thử thách kiến thức/}).click();
 for(let i=0;i<sampleStudy.quiz.length;i++){
 await page.locator(".quiz-option").nth(sampleStudy.quiz[i].answer).click();
 await expect(page.locator(".quiz-explanation")).toContainText("Chính xác!");
 await page.getByRole("button",{name:i===4?"Xem kết quả":"Câu tiếp theo",exact:true}).click();
 }
 await expect(page.locator(".result-score")).toContainText("5");
 await page.goto("/app?mode=demo");
 await expect(page.locator(".stat-card").filter({hasText:"Lượt ôn gần đây"}).locator("strong")).toHaveText("1");
});
test("flashcards complete with self assessment",async({page})=>{
 await page.goto("/app?mode=demo&view=games&note="+noteId);
 await page.getByRole("button",{name:/Lật thẻ, nhớ lâu/}).click();
 for(let i=0;i<sampleStudy.flashcards.length;i++){
 await page.getByRole("button",{name:"Lật thẻ xem đáp án",exact:true}).click();
 await page.getByRole("button",{name:"Đã nhớ",exact:true}).click();
 }
 await expect(page.locator(".result-score")).toContainText("6");
 await expect(page.getByText("thẻ bạn tự đánh giá đã nhớ")).toBeVisible();
});
test("matching scores true source pairs regardless of shuffle",async({page})=>{
 await page.goto("/app?mode=demo&view=games&note="+noteId);
 await page.getByRole("button",{name:/Kết nối ý tưởng/}).click();
 for(let i=0;i<sampleStudy.pairs.length;i++){
 await page.locator(".match-board > div").first().getByRole("button").nth(i).click();
 await page.locator(".match-board > div").nth(1).getByRole("button",{name:sampleStudy.pairs[i].definition,exact:true}).click();
 }
 await expect(page.locator(".result-score")).toContainText("5");
});
test("demo chat tells users no question is sent",async({page})=>{
 await page.goto("/app?mode=demo&view=chat");
 await page.getByLabel("Câu hỏi học tập",{exact:true}).fill("Giải thích kỳ vọng");
 await page.getByRole("button",{name:"Gửi câu hỏi",exact:true}).click();
 await expect(page.locator(".chat-error")).toContainText("chưa có câu hỏi nào được gửi");
});
test("demo scan does not pretend to invoke Gemini",async({page})=>{
 await page.goto("/app?mode=demo&view=scan");
 await expect(page.getByRole("button",{name:"Nhận diện bằng Gemini"})).toBeDisabled();
 await expect(page.getByText("Bản mẫu chưa nhận diện ảnh.")).toBeVisible();
});
test("mobile navigation fits viewport",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/app?mode=demo");
 await page.getByRole("button",{name:"Mở menu",exact:true}).click();
 await page.getByRole("button",{name:"Thư viện kiến thức",exact:true}).click();
 await expect(page.getByRole("heading",{level:1,name:"Thư viện kiến thức"})).toBeVisible();
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.viewport);
});
test("anonymous API requests rejected",async({request})=>{
 for(const path of ["notes","attempts","chat"]){
 const r=await request.get("/api/"+path);
 expect(r.status()).toBe(401);
 }
});
