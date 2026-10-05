# Triển khai NoteLab

## 1. Firebase Authentication
Tạo Firebase project và Web app. Bật Email/Password và Google trong Authentication → Sign-in method. Điền 4 biến NEXT_PUBLIC_FIREBASE_* theo .env.example.

Tạo service account riêng trong Project settings → Service accounts. Đưa project_id, client_email, private_key vào FIREBASE_ADMIN_* ở môi trường server. Không commit JSON tài khoản dịch vụ. Với private key nhiều dòng, có thể dùng chuỗi có \n; app tự chuyển về newline.

Trong Authentication → Settings → Authorized domains, thêm domain production Vercel và domain riêng nếu có. Kiểm tra mẫu thư xác minh và reset mật khẩu. App yêu cầu email_verified ở cả UI và API; người chưa xác minh không đọc/ghi dữ liệu hoặc gọi AI.

## 2. Gemini
Tạo API key cho dự án của bạn tại Google AI Studio. Đặt GEMINI_API_KEY trên server. GEMINI_MODEL mặc định gemini-2.5-flash; chọn một model đang được tài khoản hỗ trợ nhận ảnh và structured JSON. Key không được đặt trong biến NEXT_PUBLIC_*.

App dùng REST generateContent, timeout 45 giây, kiểm tra JSON bằng Zod, tối đa 3 ảnh, và quota mặc định 40 lần gọi/người/ngày UTC. Quota trong app không thay thế giới hạn chi phí/quota của nhà cung cấp. Các lần gọi thất bại vẫn tiêu thụ lượt để chống retry lạm dụng.

## 3. Oracle Cloud Always Free
Tạo Autonomous Database thuộc cấu hình Always Free còn khả dụng trong tenancy/region của bạn. Không bật nâng cấp trả phí nếu chưa chủ động chọn. Chọn workload phù hợp, ghi lại connection string TLS đầy đủ từ trang kết nối.

Ứng dụng dùng node-oracledb Thin. ORACLE_CONNECT_STRING phải là descriptor TLS đầy đủ hoặc chuỗi kết nối được node-oracledb hỗ trợ. Nếu database yêu cầu mTLS, điền ORACLE_WALLET_CONTENT_BASE64 bằng nội dung file ewallet.pem được base64, cùng ORACLE_WALLET_PASSWORD; không truyền cả file ZIP wallet.

Tạo user ứng dụng riêng bằng ADMIN trong SQL worksheet:
~~~sql
CREATE USER NOTELAB IDENTIFIED BY "REPLACE_WITH_A_STRONG_PASSWORD";
GRANT CREATE SESSION, CREATE TABLE TO NOTELAB;
ALTER USER NOTELAB QUOTA 100M ON DATA;
~~~
Chỉ đưa user NOTELAB vào ORACLE_USER, không dùng ADMIN cho ứng dụng. Đặt ORACLE_PASSWORD và kết nối trong .env.local để chạy migration:
~~~bash
npm install
npm run db:migrate
npm run db:check
~~~
Migration có tracking và có thể chạy lại. Database cần truy cập được từ môi trường Vercel; kiểm tra cấu hình mạng/ACL và TLS của database theo nhu cầu của bạn. Không đưa wallet vào public/ hoặc git.

## 4. Vercel
1. Đăng nhập Vercel bằng tài khoản của bạn.
2. Add New → Project → Import Git Repository → hungle2006/Note_App.
3. Framework: Next.js. Node 22.x hoặc 24.x. Root directory: /. Build: npm run build. Install: npm install.
4. Điền các biến .env.example tại Project → Settings → Environment Variables. Public Firebase config là thông tin client; Admin key, Gemini key và Oracle credentials là secrets chỉ dùng server.
5. Chọn Production cho dữ liệu thật. Với Preview, nên dùng dự án/schema riêng hoặc không cung cấp secrets.
6. Deploy. Thêm domain vừa tạo vào Firebase authorized domains, sau đó kiểm tra đăng ký, xác minh email và Google sign-in.
7. Chạy db:migrate trước lần sử dụng dữ liệu thật. Redeploy sau khi thay đổi biến NEXT_PUBLIC_* vì chúng được build vào client bundle.

vercel.json đặt AI functions maxDuration 60s. Các tác vụ dài hơn hiện không chạy nền; request có thể hết thời gian tùy gói Vercel và dịch vụ. App sử dụng pool nhỏ 0–2 connection mỗi instance, không giữ một pool duy nhất cho toàn bộ nền tảng.

## Kiểm tra sau triển khai
- Đăng ký email mới, mở thư xác minh, vào ứng dụng; thử đăng nhập Google.
- Lưu một bài thủ công; đăng xuất rồi đăng nhập lại để xác nhận lưu Oracle.
- Dùng ảnh vở rõ nét, kiểm tra chỗ nhận diện không chắc chắn trước khi lưu.
- Tạo cả 3 dạng ôn, hoàn thành quiz; kiểm tra kết quả sau reload.
- Chat theo bài học; reload và kiểm tra lịch sử.
- Dùng tài khoản thứ hai để xác nhận không xem/sửa/xóa bài tài khoản đầu.
- Sửa bài làm bộ ôn cũ mất hiệu lực; xóa bài xóa kết quả liên quan.
- Tab Cài đặt chỉ báo biến môi trường có đủ; không phải kiểm tra kết nối sống. Dùng db:check và các luồng trên để xác nhận.

Các trang cấu hình chính thức: https://console.firebase.google.com/ · https://aistudio.google.com/ · https://cloud.oracle.com/ · https://vercel.com/new
