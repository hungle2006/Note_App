# Kế hoạch sản phẩm NoteLab
## Người dùng và trải nghiệm
Học sinh/sinh viên cần biến vở giấy thành tài liệu dễ tìm và dễ ôn. Giữ cấu trúc môn → chương → bài; người dùng xác nhận bản nhận diện trước khi AI dùng làm nguồn học.

## Phiên bản đã triển khai trong mã nguồn
1. Khởi đầu: trang giới thiệu, đăng ký/đăng nhập, xác minh, tài khoản và bản mẫu.
2. Thu thập: chụp ảnh/upload, giới hạn và nén ảnh, sắp xếp trang, nhận diện Gemini, sửa văn bản/LaTeX.
3. Tổ chức: môn/chương/tags, tìm kiếm không dấu, đọc Markdown, sửa/xóa/xuất bài.
4. Học: chatbot theo nguồn, 3 dạng trò chơi, giải thích đáp án, lịch ôn theo kết quả.
5. Vận hành: API bảo vệ token, tách dữ liệu UID, Oracle migration, quota, CI và cấu hình Vercel.

## Tiêu chí hoàn thiện trước khi mở công khai
- Cấu hình và kiểm chứng Firebase/Gemini/Oracle bằng tài khoản thật.
- Kiểm tra ảnh viết tay và công thức từ nhiều môn; lấy phản hồi về phần chưa chắc chắn.
- Kiểm tra điện thoại, bàn phím, chữ dài, dữ liệu rỗng và giới hạn quota.
- Xác định chính sách lưu trữ/xóa tài khoản và theo dõi lỗi không thu thập nội dung vở.
- Hoàn thành kiểm tra quyền truy cập chéo bằng hai tài khoản thật.

## Các bước sau, chưa được hiện thực hóa
- Nhắc ôn có thông báo, thống kê lịch sử đầy đủ vượt 200 lượt gần nhất.
- Xóa toàn bộ tài khoản/dữ liệu và thời hạn lưu ảnh.
- Lưu ảnh object storage thay vì CLOB để mở rộng dữ liệu.
- Chia sẻ nhóm học, giáo viên duyệt học liệu, import PDF.
- Tác vụ AI nền, stream chat, moderation và quan sát lỗi với dữ liệu tối thiểu.
Không đưa các mục này vào giao diện như tính năng đang hoạt động.
