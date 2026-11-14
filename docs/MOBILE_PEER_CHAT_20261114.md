# Mobile Bạn học – màn trò chuyện toàn màn hình

## Lý do sửa
Trước đây `.peers-layout` bị giới hạn bởi chiều cao task và `.view-transition` làm `position:fixed` bị lệch khỏi góc màn hình. `scrollIntoView` cũng có thể đẩy cuộn toàn bộ trang khi nhận tin mới. Trên điện thoại, ô nhắn và thanh điều hướng có nguy cơ che nhau.

## Hành vi sau khi sửa
- Danh sách bạn học vẫn trong task, có hai tab Khám phá/Tin nhắn.
- Khi chọn người học, chỉ riêng **màn trò chuyện** mở toàn vùng điện thoại bằng React Portal, không bị giới hạn bởi chuyển cảnh của workspace.
- Nút quay lại 44px trở về danh sách tương ứng; nhấn Escape cũng đóng chat.
- Header tên, trạng thái online, khu tin nhắn và ô gửi là ba khu độc lập. Chỉ phần tin nhắn được cuộn.
- Ô nhập tự mở rộng từ 45px đến tối đa 136px; trên điện thoại Enter dùng để xuống dòng, nhấn nút gửi để gửi; trên desktop Enter vẫn gửi, Shift+Enter xuống dòng.
- Dùng VisualViewport khi bàn phím ảo mở/đóng; tính safe-area iPhone, kể cả PWA, và tránh lộ nội dung sau overlay.
- Giữ nguyên API, Firebase/Turso, kiểm tra chặn bạn học, quyền riêng tư và sổ tin nhắn; không migrate dữ liệu.

## Quy trình QA
- TypeScript `npm run typecheck`, unit/integration `npm test`, production `npm run build`.
- Chrome headless dùng fixture DOM để kiểm tra CSS của cửa sổ trò chuyện: 320×700, 375×812, 390×844, 428×926 và điện thoại xoay ngang 844×390.
- Ở mọi kích thước nêu trên: khung chat bắt đầu tại góc (0,0), chiều ngang khớp viewport, ô gửi ở cạnh dưới, có cuộn tin nhắn riêng và không tràn ngang.
- Giả lập bàn phím bằng cách giảm chiều cao VisualViewport: khung tin nhắn co lại thay vì đẩy ô gửi ra ngoài.
- Đây là kiểm thử CSS trên Chromium với nội dung minh họa. Vẫn cần kiểm tra thao tác với hai tài khoản thật và bàn phím Safari trên iPhone thực tế.
