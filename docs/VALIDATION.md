# Kiểm thử và giới hạn xác nhận
## Kiểm tra tự động
- TypeScript strict và production build.
- Unit tests: schema note/ảnh/quiz/lớp, chấm điểm server, lịch ôn, dữ liệu THCS, retrieval không dấu/lọc lớp/giới hạn nguồn và Mistral HTTP mock (payload nguồn, lỗi key/quota).
- Playwright: landing, đăng ký khi thiếu config, bản mẫu, thư viện, thêm/sửa/xóa bài, quiz/flashcard/ghép cặp, chat mẫu, mobile, lưu theme sáng/tối, giảm chuyển động và lọc lớp.
- GitHub Actions dùng môi trường không có khóa dịch vụ; chỉ kiểm tra bản mẫu và API không cấu hình.

Các test này không chứng minh Firebase, Gemini, Mistral hoặc Oracle đã được kết nối thật. Thực hiện checklist docs/DEPLOYMENT.md với credentials riêng trước khi production.

## QA thủ công cần thực hiện
Kiểm tra nhận diện ảnh viết tay và công thức, hiệu năng ảnh lớn, UI trên thiết bị thực, bàn phím/screen reader, xác thực chéo UID, lỗi mạng/quota, connection pool Oracle và domain Firebase production.

## Xác nhận bản THCS
- Production build thành công.
- 20 unit test và 16 luồng Playwright đạt; thêm một lượt QA chụp giao diện desktop/mobile sáng/tối và kiểm tra lỗi JavaScript.
- Chưa kiểm thử trực tiếp các nhà cung cấp do môi trường triển khai chưa có biến dịch vụ.

## Trạng thái
Xem trạng thái CI của commit hiện tại tại tab Actions. Không coi nút Cài đặt “đã cấu hình” là health check. Mã nguồn chưa chứa credentials và không tự tạo dịch vụ cloud.
