# NoteLab THCS · Kế hoạch sản phẩm v2
## Mục tiêu
Giúp học sinh lớp 6–9 hiểu và ôn kiến thức từ chính vở học. Dữ liệu mẫu minh họa mức THCS, không khẳng định bao phủ đầy đủ chương trình của một bộ sách.

## Luồng đã có
1. Landing với mô hình 3D, sáng/tối và chuyển động có thể tắt.
2. Đăng ký email/Google, xác minh email, reset mật khẩu.
3. Chụp/upload tối đa 3 trang; Gemini nhận diện; người dùng kiểm tra, chọn lớp/môn/chương và lưu.
4. Thư viện phân lớp/môn/chương, tìm kiếm không dấu, Markdown/LaTeX, sửa/xóa/xuất.
5. Gia sư Mistral chọn bài hoặc tìm thư viện cá nhân, giải thích/gợi ý/luyện tập và hiển thị nguồn.
6. Gemini tạo 3 dạng ôn: flashcard, quiz và ghép cặp; chấm điểm server, gợi ý ngày ôn.
7. Oracle persistence, quota, migration, GitHub CI và Vercel.

## Điều kiện vận hành thật
Firebase/Gemini/Mistral/Oracle phải được cấu hình và kiểm thử bằng tài khoản thật. Vercel deploy giao diện không tự tạo các dịch vụ này. Kiểm tra phân tách dữ liệu bằng hai UID và xác nhận migration 002 trước khi dùng database.

## Tiếp theo, chưa có
Semantic retrieval cho từ đồng nghĩa, stream chat, chống ghi đè chat đa tab, profile/tiến độ đồng bộ chi tiết, xóa toàn bộ tài khoản, thông báo ôn, object storage ảnh và giáo viên duyệt học liệu.
