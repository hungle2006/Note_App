# Bản cập nhật NoteApp: bạn học, điểm danh, vũ trụ và màu RGB

## Chức năng đã triển khai trong mã nguồn

- **Bạn học:** tìm tài khoản đã xác minh theo tên hoặc email đầy đủ, trò chuyện riêng hai người, lịch sử phân trang, số tin chưa đọc, chặn/bỏ chặn. Tin nhắn mới cập nhật tự động khoảng 4 giây khi mở hội thoại. Dữ liệu thật dùng Firebase và Turso hiện có. Bản mẫu yêu cầu đăng nhập để trò chuyện, không giả lập bạn học thật.
- **Điểm danh 7 tuần:** 49 ngày, nhận 10 xu/ngày; thêm 20 xu ở mỗi mốc 7 ngày và 100 xu ngày 49. Hoàn thành cả chu kỳ nhận 730 xu. Xu dùng chung ví Điểm Nắng. Mốc ngày tính theo Việt Nam; giao dịch và điểm danh được lưu nguyên tử, không thưởng hai lần khi gửi lại yêu cầu. Bỏ lỡ ngày đặt lại chuỗi, giữ xu cũ. Bản mẫu chỉ cho thử lịch, không cộng vào ví thật.
- **Vũ trụ của em:** mô hình Blender gồm Mặt Trời và tám hành tinh, vành đai Sao Thổ, Mặt Trăng minh họa. Kéo xoay, chụm/cuộn thu phóng, chọn hành tinh bằng mô hình hoặc danh sách, tạm dừng, đổi tốc độ và về toàn cảnh. Mỗi điểm có bài học, ý tưởng thảo luận và một câu hỏi. Có nguồn NASA. Đây là mô phỏng giáo dục, không dùng tỉ lệ thiên văn thật và không mô phỏng toàn bộ vũ trụ.
- **Màu RGB:** chọn màu bằng bảng màu hoặc nhập R/G/B từ 0–255 trong Tài khoản & kết nối. Phối màu nền và điểm nhấn, giữ sáng/tối, lưu trên thiết bị. Nút Màu mặc định khôi phục cam gốc.

## Dữ liệu và triển khai

Các bảng mới được tạo bổ sung tự động khi kết nối Turso, giữ nguyên dữ liệu cũ. Bản SQL tham khảo: database/003_community.sql. Không cần thêm dịch vụ bên thứ ba. Firebase Admin hiện có cần quyền đọc danh sách tài khoản để tìm bạn học.

Tệp dựng: design/solar-system.blend. Mô hình web: public/models/solar-system.glb. Tạo lại bằng `blender -b --python scripts/blender_solar.py`.

## Kiểm định

- TypeScript: đạt.
- 124 bài kiểm thử tự động: đạt, gồm phân quyền hội thoại, chống gửi trùng, chặn hai chiều, phân trang, giới hạn gửi, ngày Việt Nam, chuỗi bị ngắt và tổng xu 49 ngày.
- Production build: đạt.
- Kiểm tra ảnh render Blender: đã thực hiện.
- Kiểm tra bố cục trực quan trong trình duyệt: chưa xác nhận; môi trường managed preview truyền cờ không tương thích với Next.js nên không khởi động được.
- Gửi/nhận thật giữa hai tài khoản trên máy chủ: cần kiểm tra sau triển khai; hiện đã kiểm thử SQL và các ranh giới quyền truy cập bằng libSQL cục bộ.

## Trạng thái bàn giao

Đây là bản mã đã build, chưa được đẩy lên GitHub và chưa triển khai. Hệ thống duyệt tự động chặn git push lên repository công khai do cần người dùng cho phép công bố mã nguồn. Không có thay đổi nào lên app đang chạy.
