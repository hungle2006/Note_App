# NoteLab THCS · Kiến trúc v2

Next.js App Router, React, TypeScript. Thiết kế responsive theo tokens cho sáng/tối; mô hình sách và hành tinh dùng CSS preserve-3d, pointer parallax và animation transform. Không tải WebGL hoặc thư viện 3D nặng. prefers-reduced-motion và nút 3D có thể tắt hiệu ứng.

## Dữ liệu và quyền
Browser lấy Firebase ID token. Server xác minh chữ ký, thu hồi và email_verified. UID do server lấy từ token; mọi truy vấn Oracle ràng buộc UID, không nhận owner từ client.
Bài được sắp xếp lớp 6–9 → môn → chương → bài. Trường grade kiểm tra ở UI, Zod và database.

## Hai vai trò AI
- Gemini: trích xuất ảnh và sinh flashcard/quiz/ghép cặp từ bài đã lưu.
- Mistral: gia sư tiếng Việt THCS, giải thích/gợi ý/luyện tập; không nhận ảnh hoặc credentials database.

## Truy xuất kiến thức cho Mistral
1. Xác thực người gọi.
2. Nếu chọn note: getNote kiểm tra owner và chỉ dùng nguồn này.
3. Nếu chọn thư viện: tách từ câu hỏi tiếng Việt/không dấu và ít ngữ cảnh câu hỏi trước, tìm search_text trong Oracle với uid và grade.
4. Oracle xếp hạng số từ khớp, lấy tối đa 80 ứng viên. Server so khớp từ hoàn chỉnh và tỷ lệ từ khớp, xếp hạng title/subject/content.
5. Chọn tối đa 4 bài, chọn các đoạn liên quan, tối đa 6.000 ký tự/bài và tổng 16.000 ký tự nguồn.
6. Gửi sources trong prompt có nhãn dữ liệu không phải chỉ dẫn; yêu cầu dẫn [1], [2], phân biệt kiến thức nguồn và giải thích bổ sung. Mistral safe_prompt bật; prompt không thể bảo đảm miễn nhiễm prompt injection.
7. Lưu câu trả lời và metadata/đoạn nguồn đã dùng trong Oracle; UI hiển thị bài làm ngữ cảnh.

Đây là retrieval theo từ khóa, không phải embeddings/semantic vector search. Từ đồng nghĩa hoặc câu hỏi mơ hồ có thể không tìm được nguồn; gia sư phải nói rõ thay vì giả nhận đã đọc toàn bộ database. Không cho LLM tự viết SQL hoặc truy cập Oracle.

## Bảng và migration
001: app_notes, app_attempts, app_chats, app_ai_usage.
002: grade, search_text CLOB và index theo uid/grade/time; backfill nội dung đã có, bài cũ không có lớp mặc định lớp 6 và cần người dùng kiểm tra.
app_migrations theo dõi tiến độ. Node Oracle Thin dùng bind, pool 0–2 connection/instance, TLS DN verification.

## Hội thoại và giới hạn
Note chat theo noteId; library chat tách ngữ cảnh general-6…general-9. Lưu 30 tin; Mistral nhận 10 tin gần nhất. Chat chưa stream và các request đồng thời ở hai tab có thể ghi đè lịch sử; cần optimistic concurrency khi mở rộng.
Quota nguyên tử Oracle áp dụng chung cho Gemini và Mistral, reset UTC (07:00 Việt Nam). API timeout 45s, Vercel maxDuration 60s.
List note 50/trang; lọc thư viện và thống kê dashboard trên bài đã tải. Attempt 200 gần nhất. Ảnh lưu CLOB; object storage là bước mở rộng.
