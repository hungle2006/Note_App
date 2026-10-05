# Kiến trúc
Next.js App Router/React/TypeScript. UI tiếng Việt và CSS riêng, không dùng thư viện giao diện nặng.

## Luồng dữ liệu
Browser lấy Firebase ID token. Next API xác minh token đã được Firebase ký, kiểm tra thu hồi và email_verified. Mọi truy vấn Oracle dùng uid từ token server, không nhận owner từ browser.

Ảnh nén trên browser → consent → POST /api/scan → quota nguyên tử trong Oracle → Gemini → Zod → người dùng sửa → POST /api/notes → Oracle. Không tự lưu bản nhận diện khi chưa xác nhận.

Study set được sinh từ nội dung note đã lưu; client không gửi nguồn tùy ý. UPDATE theo updated_at ngăn kết quả AI ghi đè bản vừa sửa. Attempt chỉ gửi lựa chọn; server tính điểm từ study set đã lưu.

Chat lấy lịch sử ngữ cảnh uid+note_id hoặc general; server xác nhận quyền sở hữu note. Lưu tối đa 30 tin. Nội dung vở được đặt trong prompt như dữ liệu nguồn và yêu cầu bỏ qua chỉ dẫn ẩn, nhưng vẫn cần người dùng kiểm tra câu trả lời AI.

## Bảng
- app_notes: nội dung/tags/ảnh/study JSON CLOB, UID, môn/chương, timestamps UTC.
- app_attempts: lượt ôn, điểm tính server, ngày ôn tiếp; FK note ON DELETE CASCADE.
- app_chats: UID + context, JSON lịch sử.
- app_ai_usage: UID + ngày UTC, quota cập nhật có điều kiện.
- app_migrations: tracking migration.

Query dùng bind parameters. CLOB trả về dạng string. Server không log token, khóa, ảnh hay prompt; chỉ request ID và tên lỗi. API no-store.

## Giới hạn
List note 50/trang; dashboard thống kê từ các bài đã tải. Attempt lấy tối đa 200 gần nhất. Thư viện lọc/tìm kiếm phía client trên các bài đã tải. Chat chưa stream. Quota tính theo UTC. Ảnh lưu Oracle, cần kế hoạch object storage khi mở rộng.
Bản mẫu dùng localStorage tách riêng; không mô phỏng một câu trả lời Gemini thật hoặc xác thực người dùng.
