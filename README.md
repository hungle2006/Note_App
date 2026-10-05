# NoteLab — biến trang vở thành không gian học tập

Web app tiếng Việt: chụp vở → Gemini trích xuất kiến thức → kiểm tra bản nhận diện → lưu theo môn/chương → trò chuyện với gia sư AI → ôn bằng flashcard, quiz và ghép khái niệm.

## Chạy
Yêu cầu Node.js 22 hoặc 24.
~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~
Mở http://localhost:3000. Chọn **Khám phá bản mẫu** để dùng dữ liệu minh họa trên trình duyệt. Chế độ mẫu không gọi Gemini, Firebase hoặc Oracle; chỉ bài đầu tiên có sẵn bộ ôn tập.

## Tính năng
- Giao diện responsive, thư viện môn/chương, tìm kiếm không dấu, Markdown/LaTeX.
- Đăng ký email, đăng nhập Google, xác minh email, đặt lại mật khẩu bằng Firebase.
- Chụp/upload tối đa 3 ảnh, nén ảnh, sắp xếp trang, nhận diện bằng Gemini có đánh dấu chỗ chưa chắc chắn và màn hình chỉnh sửa.
- Chatbot theo bài học, lưu tối đa 30 tin mỗi ngữ cảnh.
- Flashcard, trắc nghiệm có giải thích, ghép cặp; chấm điểm ở server và gợi ý lịch ôn.
- Oracle Autonomous Database với phân tách dữ liệu theo Firebase UID, quota AI theo ngày.
- Thêm/sửa/xóa bài, tải Markdown; sửa bài sẽ xóa bộ ôn và tiến độ cũ.

## Tài liệu
- [Triển khai Firebase, Oracle, Gemini và Vercel](docs/DEPLOYMENT.md)
- [Kế hoạch sản phẩm](docs/PRODUCT_PLAN.md)
- [Kiến trúc và luồng dữ liệu](docs/ARCHITECTURE.md)
- [Kiểm thử và giới hạn](docs/VALIDATION.md)

## Kiểm tra
~~~bash
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npx playwright test
~~~
GitHub Actions chạy các bước trên khi push hoặc mở pull request.

Không commit .env.local, khóa dịch vụ, wallet Oracle hay mật khẩu. Tạo mã nguồn không tự tạo các tài khoản dịch vụ. Cần cấu hình dự án Firebase, Gemini API key, schema Oracle và biến môi trường Vercel để vận hành thật.
