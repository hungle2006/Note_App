# Triển khai NoteLab

## 1. Firebase Authentication
Tạo Firebase project và Web app. Bật Email/Password và Google trong Authentication → Sign-in method. Điền 4 biến NEXT_PUBLIC_FIREBASE_* theo .env.example.

Tạo service account riêng trong Project settings → Service accounts. Đưa project_id, client_email, private_key vào FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL và FIREBASE_PRIVATE_KEY ở môi trường server. Không commit JSON tài khoản dịch vụ. Với private key nhiều dòng, có thể dùng chuỗi có \n; app tự chuyển về newline.

Trong Authentication → Settings → Authorized domains, thêm domain production Vercel và domain riêng nếu có. Kiểm tra mẫu thư xác minh và reset mật khẩu. App yêu cầu email_verified ở cả UI và API; người chưa xác minh không đọc/ghi dữ liệu hoặc gọi AI.

## 2. Gemini
Tạo API key cho dự án của bạn tại Google AI Studio. Đặt GEMINI_API_KEY trên server. GEMINI_MODEL mặc định gemini-2.5-flash; chọn một model đang được tài khoản hỗ trợ nhận ảnh và structured JSON. Key không được đặt trong biến NEXT_PUBLIC_*.

App dùng REST generateContent, timeout 45 giây, kiểm tra JSON bằng Zod, tối đa 3 ảnh, và quota mặc định 40 lần gọi/người/ngày UTC. Quota trong app không thay thế giới hạn chi phí/quota của nhà cung cấp. Các lần gọi thất bại vẫn tiêu thụ lượt để chống retry lạm dụng.

## 3. Groq (gia sư)
Tạo API key của bạn tại https://console.groq.com/keys. Đặt GROQ_API_KEY ở server và GROQ_MODEL=openai/gpt-oss-120b hoặc model Chat Completions đang được tài khoản hỗ trợ. Không đặt key trong biến NEXT_PUBLIC_*. Model mặc định là `openai/gpt-oss-120b`; app gọi Groq Chat Completions, chỉ lưu câu trả lời cuối cùng. Sau khi thêm key ở Vercel Production, redeploy để áp dụng. `MISTRAL_API_KEY` cũ không được dùng làm key Groq.

Groq chỉ dùng cho gia sư. Gemini tiếp tục nhận diện ảnh và tạo bộ ôn. Gia sư nhận câu hỏi, 10 tin gần nhất và tối đa 4 đoạn nguồn được truy xuất từ Turso theo UID/lớp; không có quyền truy cập database trực tiếp. Hướng dẫn theo THCS không thay thế việc đối chiếu câu trả lời.

## 4. Turso
Mở workspace https://app.turso.tech/hungle2006. Chọn một **database libSQL riêng cho NoteLab** hoặc tạo database libSQL mới trong gói hiện có. Dự án dùng @libsql/client/http; không dùng database engine Turso rewrite cho cấu hình này.

Trong trang database, lấy Database URL dạng libsql://...turso.io và database token có quyền đọc/ghi. Token phải thuộc đúng database; không dùng organization API token. Không dùng URL dashboard làm URL database. Giữ token ở server, không đặt NEXT_PUBLIC_* và không đưa vào git hoặc chat.

Điền vào Vercel → Project → Settings → Environment Variables → Production:

| Biến | Giá trị |
| --- | --- |
| TURSO_DATABASE_URL | Database URL lấy từ trang database |
| TURSO_AUTH_TOKEN | Database token có quyền đọc/ghi |

Redeploy sau khi thêm hai biến. Schema turso-001 tự tạo ở request dữ liệu đầu tiên sau khi đăng nhập; migration chỉ thêm bảng/index còn thiếu, không xóa database. Với máy phát triển, đặt hai biến trong .env.local và chạy:

~~~bash
npm ci
npm run db:migrate
npm run db:check
~~~

Nguồn migration là src/lib/server/turso-schema.ts; database/001_turso.sql là bản SQL để xem/chạy trong SQL console. db:check chỉ đọc, báo bảng/cột/phiên bản và số bản ghi, không in token. Hạn chế token ở đúng database này, theo dõi thời hạn token và mức sử dụng gói Turso. Production và Preview nên dùng database riêng.

Thay backend không tự chuyển dữ liệu từ Oracle đã có. Migration Oracle cũ được giữ trong database/legacy-oracle để tham khảo; không chạy các file đó trên Turso. Nếu có dữ liệu cũ, cần export/import riêng trước khi chuyển traffic. Không có kết nối Oracle đang được cấu hình trên Vercel ở thời điểm chuyển đổi này.

## 5. Vercel
1. Đăng nhập Vercel bằng tài khoản của bạn.
2. Add New → Project → Import Git Repository → hungle2006/Note_App.
3. Framework: Next.js. Node 24.x. Root directory: /. Build: npm run build. Install: npm ci.
4. Điền các biến .env.example tại Project → Settings → Environment Variables. Public Firebase config là thông tin client; Admin key, Gemini/Groq keys và Turso token là secrets chỉ dùng server.
5. Chọn Production cho dữ liệu thật. Với Preview, nên dùng dự án/database riêng hoặc không cung cấp secrets.
6. Deploy. Thêm domain vừa tạo vào Firebase authorized domains, sau đó kiểm tra đăng ký, xác minh email và Google sign-in.
7. Schema tự bootstrap ở lần đọc/ghi đầu tiên; có thể chạy db:migrate để kiểm tra trước. Redeploy sau khi thay đổi biến NEXT_PUBLIC_* vì chúng được build vào client bundle.

vercel.json đặt AI functions maxDuration 60s. Các tác vụ dài hơn hiện không chạy nền; request có thể hết thời gian tùy gói Vercel và dịch vụ. Client HTTP được tái sử dụng trong từng instance và không lưu SQLite local trên Vercel.

## Kiểm tra sau triển khai
- Đăng ký email mới, mở thư xác minh, vào ứng dụng; thử đăng nhập Google.
- Lưu một bài thủ công; đăng xuất rồi đăng nhập lại để xác nhận lưu Turso.
- Dùng ảnh vở rõ nét, kiểm tra chỗ nhận diện không chắc chắn trước khi lưu.
- Tạo cả 3 dạng ôn, hoàn thành quiz; kiểm tra kết quả sau reload.
- Chat theo bài học bằng Groq; kiểm tra bài nguồn và lịch sử sau reload.
- Chat tìm thư viện theo lớp; tài khoản thứ hai không được thấy nguồn của tài khoản đầu.
- Kiểm tra giao diện sáng/tối sau reload và nút 3D; thử chế độ giảm chuyển động trên điện thoại.
- Dùng tài khoản thứ hai để xác nhận không xem/sửa/xóa bài tài khoản đầu.
- Sửa bài làm bộ ôn cũ mất hiệu lực; xóa bài xóa kết quả liên quan.
- Tab Cài đặt chỉ báo biến môi trường có đủ; không phải kiểm tra kết nối sống. Dùng db:check và các luồng trên để xác nhận.

Các trang cấu hình chính thức: https://console.firebase.google.com/ · https://aistudio.google.com/ · https://app.turso.tech/ · https://vercel.com/new

## Chẩn đoán đăng nhập Google
- `CONFIGURATION_NOT_FOUND`: mở Firebase project tương ứng với `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, vào Authentication → Get started nếu chưa khởi tạo. Trong Sign-in method/Providers, bật Google và chọn email hỗ trợ. Bật Email/Password để dùng form email.
- `unauthorized-domain`: thêm chính xác hostname của app vào Settings → Authorized domains. Với bản production hiện tại: `noteappme.vercel.app`. Nếu sử dụng alias khác, thêm từng hostname đó; không thêm `https://` hoặc đường dẫn.
- `popup-blocked`: cho phép popup, mở app bằng Chrome/Safari thay vì trình duyệt trong ứng dụng. App giữ popup để tránh phụ thuộc redirect với storage khác origin trên Vercel.
- Sau khi chỉnh biến `NEXT_PUBLIC_FIREBASE_*`, phải redeploy vì chúng được đóng vào client bundle khi build. JSON service account chỉ dành cho Firebase Admin ở server, không thay thế việc bật Authentication/Google provider.
- Lỗi cấu hình được hiển thị ngay trên nút Google; trạng thái chờ Google và email tách biệt. App chỉ điều hướng sau khi AuthProvider nhận được user, tránh trở lại login khi trạng thái phiên cập nhật muộn.

### Ghi nhận ngày 06/10/2026
Lần kiểm tra mới nhất: API project-config của Firebase trả HTTP 200, Authentication đã được khởi tạo và `noteappme.vercel.app` có trong authorized domains. Tên miền này đã được gắn vào dự án Vercel. Chưa xác nhận được Google OAuth thành công bằng tài khoản thật; kiểm tra cấu hình không chứng minh luồng đăng nhập hoàn tất.

## Chẩn đoán phiên đăng nhập và Firebase Admin
- `TOKEN_EXPIRED`: client làm mới ID token và thử lại đúng một lần. Nếu vẫn thất bại, đăng nhập lại.
- `TOKEN_REVOKED` hoặc `ACCOUNT_DISABLED`: không tự làm mới hoặc thử lại. Phiên bị thu hồi cần đăng nhập lại; tài khoản bị khóa cần người quản trị xử lý.
- `AUTH_NOT_CONFIGURED`: thiếu một trong ba biến Firebase Admin ở môi trường Production.
- `AUTH_PROJECT_MISMATCH`: `FIREBASE_PROJECT_ID` phải khớp `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- `AUTH_INVALID_CLIENT_EMAIL`: biến `FIREBASE_CLIENT_EMAIL` phải chứa giá trị `client_email` của tài khoản dịch vụ Firebase.
- `AUTH_INVALID_PRIVATE_KEY`: kiểm tra định dạng `FIREBASE_PRIVATE_KEY`. Nên điền giá trị của thuộc tính `private_key`; app nhận PEM nhiều dòng, chuỗi có `\n` hoặc chuỗi PEM có dấu ngoặc kép. Nếu đã dán cả JSON service account vào biến này, app chỉ nhận khi `project_id` và `client_email` trong JSON khớp hai biến tương ứng, không tự đổi project/tài khoản.
- `AUTH_SERVER_CREDENTIALS`: máy chủ không khởi tạo/xác thực được hoặc service account không có quyền cần thiết. Kiểm tra khóa còn hoạt động, email tài khoản dịch vụ và quyền Firebase Authentication; không đưa khóa vào chat hoặc git.
- `AUTH_SERVICE_UNAVAILABLE`: Firebase hoặc mạng xác thực tạm thời lỗi. Thử lại sau; đăng nhập lại không sửa được lỗi máy chủ.

`GET /api/status` có trường `firebaseAdmin`: `ready`, `missing`, `invalid-client-email`, `invalid-private-key`, `invalid`, `project-mismatch` hoặc `unavailable`. `ready` chỉ xác nhận biến có đủ, PEM RSA đọc được và project khớp; không chứng minh khóa còn hoạt động trên Google, quyền truy cập, kết nối Turso hay AI. API không trả giá trị khóa hoặc chi tiết lỗi SDK.

`firebaseAdminRuntime` trong `/api/status` kiểm tra SDK có khởi tạo được trong bản triển khai hay không. `AUTH_RUNTIME_MISSING`, `AUTH_RUNTIME_INCOMPATIBLE` hoặc `AUTH_INITIALIZATION_FAILED` là lỗi runtime/build, không phải bằng chứng khóa Firebase sai. Kiểm tra này không gọi Google OAuth và không đọc tài khoản người dùng.

Firebase Admin được pin ở 13.6.0 để dùng chuỗi phụ thuộc CommonJS trên Vercel. Node của package, CI và Vercel được đồng bộ ở 24.x. `GET /api/status?check=firebase` kiểm tra kết nối Google và quyền users.get bằng UID kiểm tra cố định; cache 60 giây, thời gian chờ phản hồi 10 giây, không trả dữ liệu người dùng. `firebaseConnection=ready` xác nhận máy chủ có thể thực hiện kiểm tra thu hồi phiên; chưa thay thế kiểm thử đăng nhập bằng tài khoản thật.

## VietScribe — note bằng giọng nói
API cố định: `https://leminhhung0101-vietscribe-ai.hf.space/gradio_api`, endpoint `/transcribe`, mode `rnnlm`. Space public không cần token. Nếu Hugging Face yêu cầu quyền/quota, thêm `VIETSCRIBE_HF_TOKEN` ở server (không dùng NEXT_PUBLIC) rồi redeploy. App không tự cấu hình phần cứng hay quota cho Space.

`POST /api/transcribe`: Firebase verified/revocation check → multipart giới hạn 4 MB audio → consent và kiểm tra file → quota UID → Gradio upload/call/SSE → bản chép lời. Timeout 210s, maxDuration 240s. Không gửi URL do người dùng nhập; không log transcript/audio; không lưu audio trong Turso. File âm thanh có thể còn trong cache của Space. Ghi âm tối đa 180s, 64kbps khi trình duyệt hỗ trợ. File dài hơn phải cắt thành đoạn; không tự chia hoặc ghi âm nền.

Kiểm tra thực tế: cấp quyền micro qua HTTPS, ghi/dừng/nghe lại; tải MP3/M4A/WAV; thử từ chối quyền, lỗi Space/quota, transcript rỗng, file quá lớn; sửa và phân loại bản chép lời rồi lưu, reload, hỏi Groq và tạo bộ ôn. Safari có thể dùng M4A thay vì WebM. Bản mẫu không gọi VietScribe.

### Gemini kiểm tra và bố trí ghi chép
`POST /api/voice-draft` nhận multipart audio (không bắt buộc), transcript, grade, subject, consentGemini=true. Auth/quota/giới hạn file giống luồng ghi âm. Máy chủ chuyển âm thanh thành inlineData (MIME chuẩn theo loại file), Gemini đối chiếu transcript và trả extraction JSON đã kiểm tra schema: title/subject/chapter/summary/tags/content Markdown/uncertain. Không tự lưu; người dùng xem bản trình bày và xác nhận lưu vào thư viện. Không thay đổi database schema. Bản gốc để so sánh chỉ giữ ở giao diện trước khi lưu.

Sau nhận dạng bằng VietScribe, app tự gọi Gemini. Nếu VietScribe lỗi và request chưa bị hủy, Gemini nhận trực tiếp audio; bản nháp có thông báo nguồn này. Nếu Gemini lỗi, giữ transcript để thử lại hoặc lưu thủ công. Mỗi lần gọi VietScribe/Gemini tiêu thụ lượt quota chung riêng, kể cả thất bại. Gemini vẫn dùng GEMINI_API_KEY và GEMINI_MODEL; không cần thêm biến mới.
