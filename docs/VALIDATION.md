# Kiểm thử và giới hạn xác nhận
## Kiểm tra tự động
- TypeScript strict và production build (webpack).
- Kiểm tra trực tiếp 6 API handler đã compile, bảo đảm module nạp đồng bộ và request chưa đăng nhập trả 401 JSON; CI chạy test:server-build sau build.
- Unit tests: schema note/ảnh/quiz/lớp, chấm điểm server, lịch ôn, dữ liệu THCS, retrieval không dấu/lọc lớp/giới hạn nguồn và Mistral HTTP mock (payload nguồn, lỗi key/quota).
- Playwright: landing, đăng ký khi thiếu config, bản mẫu, thư viện, thêm/sửa/xóa bài, quiz/flashcard/ghép cặp, chat mẫu, mobile, lưu theme sáng/tối, giảm chuyển động và lọc lớp.
- libSQL integration: migration lặp lại, CRUD/JSON/UTC, phân quyền UID, phân trang, tìm nguồn theo lớp ngoài trang đầu, version bộ ôn, transaction rollback, khóa ngoại, xóa dữ liệu liên quan và quota đồng thời.
- Auth (SDK mock tại ranh giới dịch vụ, component thật): chờ AuthProvider trước khi chuyển trang, loading Google/email tách biệt, lỗi nằm trên nút Google, retry sau lỗi và không crash khi Firebase khởi tạo thất bại.
- Auth: thông báo riêng cho lỗi cấu hình/provider/domain/popup, xử lý lỗi null và không lộ chi tiết backend.
- Typography: font Nunito Sans/Lora tự host có subset tiếng Việt; kiểm tra glyph thường/nghiêng, giữ font KaTeX, không tràn ngang ở 320/390/768 px với cả hai theme.
- GitHub Actions dùng môi trường không có khóa dịch vụ; kiểm tra database libSQL local, bản mẫu và API không cấu hình.

Các test này không chứng minh Firebase, Gemini, Mistral hoặc Turso đã được kết nối thật. Thực hiện checklist docs/DEPLOYMENT.md với credentials riêng trước khi production.

## QA thủ công cần thực hiện
Kiểm tra nhận diện ảnh viết tay và công thức, hiệu năng ảnh lớn, UI trên thiết bị thực, bàn phím/screen reader, xác thực chéo UID, lỗi mạng/quota, kết nối HTTP Turso và domain Firebase production.

## Xác nhận bản THCS
- Production build thành công.
- 35 unit/integration test, 25 luồng Playwright và 6 kiểm tra API handler compile đạt; thêm một lượt QA chụp giao diện desktop/mobile sáng/tối và kiểm tra lỗi JavaScript.
- Vercel đã có biến Firebase/Gemini/Mistral; chưa kiểm thử các dịch vụ đó bằng tài khoản học sinh thật. Turso còn cần Database URL và database token của tài khoản chủ sở hữu; test libSQL local không chứng minh kết nối Turso cloud.

## Trạng thái
Xem trạng thái CI của commit hiện tại tại tab Actions. Không coi nút Cài đặt “đã cấu hình” là health check. Mã nguồn chưa chứa credentials và không tự tạo dịch vụ cloud.
