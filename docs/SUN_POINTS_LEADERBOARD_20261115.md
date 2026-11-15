# Task Top 10 Điểm Nắng · 15/11/2026

## Mục tiêu
Thêm trang **Top 10 Điểm Nắng** vào sidebar, trang chủ và Góc thành tích của SmartNotes AI. Bảng chỉ sử dụng điểm thật đã ghi trong Turso; không tạo tên hoặc điểm giả trên production.

## Quy tắc xếp hạng
- Tổng điểm đã kiếm (`app_points_ledger.kind='practice' AND amount>0`), từ ôn tập, điểm danh và hoạt động hợp lệ, **không phải số dư ví**.
- Đổi huy hiệu hoặc pet ghi giao dịch âm `redeem`; điểm xếp hạng không giảm vì những giao dịch này.
- Top 10 theo tổng điểm giảm dần; bằng điểm ưu tiên biệt danh theo bảng chữ cái, sau đó UID (UID chỉ dùng nội bộ, API không công khai).
- Tài khoản tham gia có thứ hạng riêng dù ngoài Top 10; tài khoản chưa tham gia chỉ thấy số Điểm Nắng đã kiếm.
- Khi ít hơn 10 người, chỉ hiển thị người thật tham gia; không thêm người hoặc điểm minh họa.

## Quyền riêng tư
- Đây là bảng **tự nguyện tham gia** dành cho người học THCS, mặc định không công khai.
- Người học nhập biệt danh 2–24 ký tự khi bật; máy chủ chỉ công khai biệt danh và tổng điểm.
- Không trả UID, email, lịch sử học, danh sách quà đã mua hoặc số dư ví trong dữ liệu công khai.
- Ẩn khỏi bảng ngay bằng nút `Ẩn khỏi bảng`, không xóa Điểm Nắng và phần thưởng.
- Không thưởng điểm vì thứ hạng, không dùng bảng để đánh giá học lực.

## Kiến trúc
- API `GET /api/leaderboard`: xác minh Firebase ID token, lấy Top 10 và vị trí cá nhân bằng Turso, chống cache.
- API `PATCH /api/leaderboard`: xác minh token, xử lý bật/tắt và biệt danh hợp lệ.
- Migration `turso-007`: thêm bảng `app_leaderboard_profiles` theo kiểu `CREATE TABLE IF NOT EXISTS`; không sửa bảng điểm hiện có.
- FE `src/components/leaderboard-view.tsx`: podium Top 3, hạng 4–10, vị trí của em, khối tham gia tự nguyện, demo không truy cập người thật.

## Kiểm thử
- Trường hợp chưa có người, chỉ 1 người, 12 người (chỉ trả 10), người ngoài Top 10, bằng điểm, đổi quà, ẩn tên, biệt danh không hợp lệ.
- Kiểm tra TypeScript và toàn bộ unit/integration test, build production trên nhánh trước khi hợp nhất.
- QA Chrome trên desktop/mobile để kiểm tra tràn ngang, vùng form và tương phản.
- Cần kiểm chứng thực tế bằng ít nhất hai tài khoản Firebase sau phát hành; bài kiểm thử không tạo bảng vinh danh giả trên production.
