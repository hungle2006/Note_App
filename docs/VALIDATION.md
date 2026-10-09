# Kiểm thử và giới hạn xác nhận
## Kiểm tra tự động
- TypeScript strict và production build (webpack).
- Kiểm tra trực tiếp 8 trường hợp API handler đã compile, bảo đảm module nạp đồng bộ và request chưa đăng nhập trả 401 JSON; CI chạy test:server-build sau build.
- Unit tests: schema note/ảnh/quiz/lớp, chấm điểm server, lịch ôn, dữ liệu THCS, retrieval không dấu/lọc lớp/giới hạn nguồn và Groq HTTP mock (payload nguồn, lỗi key/quota).
- Playwright: landing, đăng ký khi thiếu config, bản mẫu, thư viện, thêm/sửa/xóa bài, quiz/flashcard/ghép cặp, chat mẫu, mobile, lưu theme sáng/tối, giảm chuyển động và lọc lớp.
- libSQL integration: migration lặp lại, CRUD/JSON/UTC, phân quyền UID, phân trang, tìm nguồn theo lớp ngoài trang đầu, version bộ ôn, transaction rollback, khóa ngoại, xóa dữ liệu liên quan và quota đồng thời.
- Auth (SDK mock tại ranh giới dịch vụ, component thật): chờ AuthProvider trước khi chuyển trang, loading Google/email tách biệt, lỗi nằm trên nút Google, retry sau lỗi và không crash khi Firebase khởi tạo thất bại.
- Auth: thông báo riêng cho lỗi cấu hình/provider/domain/popup, xử lý lỗi null và không lộ chi tiết backend.
- Native fetch: kiểm tra trong Chromium thật, gọi đúng ngữ cảnh Window và gửi lại request bằng token mới sau khi hết hạn.
- Phiên API: phân biệt lỗi máy chủ với token hết hạn/thu hồi; kiểm tra PEM và project; refresh đúng một lần khi token hết hạn, không retry phiên bị thu hồi hoặc lỗi server, không gửi token cũ sau khi đăng xuất.
- Typography: font Nunito Sans/Lora tự host có subset tiếng Việt; kiểm tra glyph thường/nghiêng, giữ font KaTeX, không tràn ngang ở 320/390/768 px với cả hai theme.
- GitHub Actions dùng môi trường không có khóa dịch vụ; kiểm tra database libSQL local, bản mẫu và API không cấu hình.

Các test này không chứng minh Firebase, Gemini, Groq hoặc Turso đã được kết nối thật. Thực hiện checklist docs/DEPLOYMENT.md với credentials riêng trước khi production.

## QA thủ công cần thực hiện
Kiểm tra nhận diện ảnh viết tay và công thức, hiệu năng ảnh lớn, UI trên thiết bị thực, bàn phím/screen reader, xác thực chéo UID, lỗi mạng/quota, kết nối HTTP Turso và domain Firebase production.

## Xác nhận bản THCS
- Production build thành công.
- 58 unit/integration test, 30 luồng Playwright và 8 kiểm tra API handler compile đạt; đã có QA giao diện desktop/mobile sáng/tối và kiểm tra lỗi JavaScript.
- Vercel đã có biến Firebase/Gemini/Turso; cần thêm GROQ_API_KEY cho gia sư Groq; chưa kiểm thử các dịch vụ đó bằng tài khoản học sinh thật. Firebase Authentication đã khởi tạo và domain `noteappme.vercel.app` đã được cho phép. Test libSQL local và kiểm tra biến môi trường không chứng minh kết nối Turso cloud.

## Trạng thái
Xem trạng thái CI của commit hiện tại tại tab Actions. Không coi nút Cài đặt “đã cấu hình” là health check. Mã nguồn chưa chứa credentials và không tự tạo dịch vụ cloud.

Kiểm tra build Firebase có cấu hình sử dụng khóa RSA sinh tạm: SDK phải nạp được và token cố ý sai trả INVALID_TOKEN (401), không bị báo nhầm thành lỗi khóa. Không dùng khóa thật hoặc gọi Google trong kiểm thử này.

Kiểm tra kết nối Firebase dùng UID cố định để xác nhận OAuth và quyền users.get; kết quả chỉ trả trạng thái, không trả thông tin tài khoản. Unit test mô phỏng user-not-found, permission denied và credential rejected.

## Ghi chép giọng nói (09/10/2026)
- Multipart giữ boundary trình duyệt và refresh Firebase đúng một lần. Kiểm tra file/signature/giới hạn, SSE chia UTF-8 và CRLF, heartbeat, rnnlm payload, transcript rỗng/lỗi và quota ZeroGPU.
- Playwright: tự nhập/chỉnh transcript → phân loại → lưu → reload thư viện; consent/file 4 MB/bản mẫu không gọi AI; từ chối micro; dừng track khi rời màn hình; bố cục 320px. Micro dùng mock ở ranh giới API thiết bị.
- API Space thực tế xác nhận upload/call/SSE đều HTTP 200, nhưng inference trả lỗi hết quota ZeroGPU cho lượt chưa đăng nhập. Chưa xác nhận bản chép lời thật hoặc chất lượng tiếng Việt. Vercel chưa có VIETSCRIBE_HF_TOKEN tại lúc kiểm tra.
