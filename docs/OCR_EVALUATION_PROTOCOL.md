# Đánh giá OCR bằng vở thật

Mục tiêu: khoảng 20 trang từ 5–6 người viết, có ảnh rõ, ảnh nghiêng, thiếu sáng và công thức/số/đơn vị. Chỉ ghi kết quả đã đo; không lấy dữ liệu demo làm thực nghiệm.

1. Xin phép sử dụng trang vở, che thông tin cá nhân. Gán mã HS01…HS06. Giữ ảnh gốc và điều kiện chụp. Ưu tiên mỗi note một trang để đối chiếu chính xác.
2. Một người đọc ảnh và chép bản chuẩn độc lập; người khác rà lại. Không dùng đầu ra AI làm bản chuẩn. Giữ đúng chữ, số, đơn vị và công thức; quy ước chuyển công thức thành văn bản thống nhất cho cả hai bản.
3. Chạy nhận diện, giữ bản OCR trước khi học sinh sửa. Trong Sổ đánh giá OCR, chọn note/trang và nhập đúng phần chữ của trang đó.
4. Đếm theo vị trí lỗi: đọc sai, bỏ sót và đề xuất đính chính sai (mỗi vị trí một lần). Ghi nhất quán quy ước đếm. CER là số phép chèn/xóa/thay ký tự chia số ký tự chuẩn sau NFC và chuẩn hóa khoảng trắng. Không gộp CER với độ đúng kiến thức.
5. Thử vài trang đúng hoàn toàn và vài trang có lỗi được cài có chủ đích. Với đính chính, cung cấp đúng SGK/bộ sách/lớp/bài/trang và đoạn trích; kiểm tra false correction, trường hợp bỏ sót lỗi và khả năng chuyển sang hỏi thầy cô.
6. Người học soát và xác nhận trước khi tạo tóm tắt, sơ đồ, thẻ. Ghi nhận mất thời gian bao lâu, phần nào dễ/khó sử dụng.
7. Xuất CSV, tổng hợp theo trang/người viết/điều kiện. Báo số lượng thật, lỗi/trang, CER (khi tính được), giới hạn mẫu và ví dụ ẩn danh. Không khẳng định kết quả đại diện cho mọi học sinh.

Chưa có ảnh kiểm thử thật trong repository. Sổ đánh giá khởi tạo rỗng. Mốc 20 trang / 5–6 bạn là kế hoạch, không phải số liệu đã hoàn thành.
