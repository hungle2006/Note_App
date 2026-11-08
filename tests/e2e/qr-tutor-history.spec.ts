import {test,expect} from "@playwright/test";

test("QR lands on a Google-first registration screen",async ({page})=>{
 await page.goto("/");
 const qr=page.getByRole("link",{name:"Mở đăng ký nhanh bằng Google"});
 await expect(qr).toHaveAttribute("href","/register?source=qr");
 await expect(qr.locator("img")).toBeVisible();
 await page.goto("/register?source=qr");
 await expect(page.getByText("Bắt đầu bằng tài khoản Google")).toBeVisible();
 await expect(page.getByRole("button",{name:"Tiếp tục với Google"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Dùng email thay thế"})).toBeVisible();
 await expect(page.getByPlaceholder("ban@gmail.com")).toHaveCount(0);
 await page.getByRole("button",{name:"Dùng email thay thế"}).click();
 await expect(page.getByPlaceholder("ban@gmail.com")).toBeVisible();
});

test("tutor has a clean new-chat action in demo without sending any AI request",async ({page})=>{
 await page.goto("/app?mode=demo&view=chat");
 await expect(page.getByRole("button",{name:"Cuộc trò chuyện mới"})).toBeVisible();
 await expect(page.getByText("Đăng nhập để lưu lịch sử trò chuyện.")).toBeVisible();
 await page.getByRole("button",{name:"Cuộc trò chuyện mới"}).click();
 await expect(page.getByRole("heading",{name:"Điều gì đang làm em tò mò?"})).toBeVisible();
});
