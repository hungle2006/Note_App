# Note App · Nâng cấp bạn học, công thức và Mặt Trời (14/11/2026)

## Phạm vi triển khai

1. **Bạn học**: mở trang tải tài khoản Firebase đã xác minh (không công khai email), có phân trang, hai tab Khám phá/Tin nhắn, sắp xếp người hoạt động lên trên mỗi trang, giao diện tìm kiếm mới và nút mở hội thoại. Dùng API đăng nhập hiện tại, không tạo dữ liệu người học giả trên production.
2. **Online**: mỗi tài khoản đăng nhập gửi heartbeat khi mở ứng dụng và khoảng 60 giây một lần khi tab hiển thị. Server ghi vào Turso; tài khoản được xem là online trong hai phút gần nhất; có nút ẩn trạng thái trong Tài khoản & kết nối. Chỉ trả boolean online cho các bạn học khác, không trả thời gian truy cập chính xác.
3. **Gia sư Groq**: dùng KaTeX/remark-math đã có sẵn, bổ sung chuẩn hóa dấu `\\[...\\]`, `\\(...\\)` (kể cả escape hai lần), giữ nguyên các khối code. Thêm CSS cuộn ngang cho công thức dài.
4. **Mặt Trời Blender**: `scripts/blender_sun.py` tạo bề mặt plasma/sunspots/granulation bằng Blender và lưu dự án chỉnh sửa được `design/sun-photosphere.blend`. Ảnh xuất rồi tối ưu là `public/images/sun-photosphere.jpg`. Three.js ánh xạ texture lên Mặt Trời GLB hiện có, thêm quầng sáng mềm, quay chậm và fallback nếu texture không tải được. Vật thể khác và bài học vẫn được giữ nguyên.
5. **Bảo vệ dữ liệu**: migration chỉ bổ sung bảng `app_peer_presence`; không xóa bảng/tin nhắn/điểm cũ.

## Kế hoạch kiểm tra và phát hành

- [x] Kiểm tra TypeScript.
- [x] 129/129 bài test, gồm KaTeX render HTML và tùy chọn trạng thái online.
- [x] Build production Next.js trong môi trường kiểm thử.
- [x] Blender 5.0.1 chạy và xuất thành công ảnh/bản .blend.
- [x] GitHub Actions chạy Blender, tối ưu ảnh, typecheck, test và build thành công rồi mới commit tài nguyên.
- [x] Vercel Preview READY; trang demo và ảnh mặt trời trả HTTP 200.
- [x] Chrome headless trên desktop và mobile: nội dung Solar demo đã render, có WebGL canvas và không có tràn ngang ở 1365px/390px.
- [ ] Kiểm chứng bằng hai tài khoản Firebase thật: tìm người dùng thật, online hai chiều, gửi/nhận và chặn, làm trên production sau phát hành.
- [ ] Kiểm chứng trực quan đa trình duyệt/thiết bị thật (Chrome/Edge/Safari iPhone) trước khi coi UI được nghiệm thu hoàn toàn.

## Bàn giao

Chọn **Bạn học** để thấy danh sách; nhấn người học để bắt đầu trò chuyện. Trong **Tài khoản & kết nối** có thể ẩn chấm xanh. **Vũ trụ của em** chọn Mặt Trời và phóng to để xem texture mới. Phần mặt trời là mô phỏng nghệ thuật giáo dục, không phải ảnh quan sát khoa học từ NASA; kích thước và thời gian quỹ đạo không theo tỉ lệ thực.
