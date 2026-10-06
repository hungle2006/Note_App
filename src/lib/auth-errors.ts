const messages: Record<string, string> = {
  "auth/email-already-in-use": "Email đã có tài khoản. Hãy đăng nhập.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/user-not-found": "Email hoặc mật khẩu không đúng.",
  "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/weak-password": "Mật khẩu chưa đủ mạnh.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/user-disabled": "Tài khoản này đã bị khóa. Hãy liên hệ người quản trị.",
  "auth/too-many-requests":
    "Bạn đã thử quá nhiều lần. Hãy chờ một chút rồi thử lại.",
  "auth/popup-closed-by-user":
    "Bạn đã đóng cửa sổ Google trước khi hoàn tất. Bấm Tiếp tục với Google để thử lại.",
  "auth/cancelled-popup-request":
    "Một cửa sổ đăng nhập Google đang mở. Hãy hoàn tất trong cửa sổ đó.",
  "auth/popup-blocked":
    "Trình duyệt đã chặn cửa sổ Google. Cho phép cửa sổ bật lên cho trang này rồi bấm Tiếp tục với Google. Nếu đang mở trong ứng dụng khác, hãy mở trang bằng Chrome hoặc Safari.",
  "auth/unauthorized-domain":
    "Đăng nhập Google chưa được cho phép trên địa chỉ web này. Người quản trị cần thêm tên miền vào Firebase Authentication.",
  "auth/operation-not-allowed":
    "Phương thức đăng nhập này chưa được bật. Người quản trị cần bật Google hoặc Email/Password trong Firebase Authentication.",
  "auth/configuration-not-found":
    "Dịch vụ đăng nhập chưa được thiết lập trong Firebase Authentication. Người quản trị cần khởi tạo Authentication và bật phương thức đăng nhập.",
  "auth/invalid-api-key":
    "Cấu hình dịch vụ đăng nhập chưa hợp lệ. Hãy liên hệ người quản trị.",
  "auth/auth-domain-config-required":
    "Dịch vụ đăng nhập Google chưa được cấu hình đầy đủ. Hãy liên hệ người quản trị.",
  "auth/app-not-authorized":
    "Dịch vụ đăng nhập chưa cho phép ứng dụng này. Hãy liên hệ người quản trị.",
  "auth/web-storage-unsupported":
    "Trình duyệt đang chặn lưu phiên đăng nhập. Hãy cho phép dữ liệu trang web hoặc mở bằng Chrome/Safari.",
  "auth/account-exists-with-different-credential":
    "Email này đang dùng phương thức đăng nhập khác. Hãy đăng nhập bằng phương thức bạn đã dùng khi đăng ký.",
  "auth/network-request-failed":
    "Không kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.",
};

export function authError(error: unknown): string {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";
  return (
    messages[code] ||
    "Chưa thể đăng nhập. Hãy thử lại sau hoặc liên hệ người quản trị nếu lỗi tiếp tục xảy ra."
  );
}
