import { ApiError } from "./http";

export function authFailure(error: unknown, stage: "initialize" | "verify") {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code : "";
  if (stage === "initialize") {
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return new ApiError(503, "AUTH_RUNTIME_MISSING", "Bản triển khai thiếu thư viện Firebase Admin. Người quản trị cần sửa bản build trên Vercel.");
    }
    if (code === "ERR_REQUIRE_ESM" || code === "ERR_REQUIRE_ASYNC_MODULE") {
      return new ApiError(503, "AUTH_RUNTIME_INCOMPATIBLE", "Thư viện Firebase Admin chưa tương thích với runtime máy chủ. Người quản trị cần sửa bản triển khai.");
    }
  }
  if (stage === "verify") {
    if (code === "auth/id-token-expired") return new ApiError(401, "TOKEN_EXPIRED", "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.");
    if (code === "auth/id-token-revoked") return new ApiError(401, "TOKEN_REVOKED", "Phiên đăng nhập đã bị thu hồi. Hãy đăng nhập lại.");
    if (code === "auth/user-disabled") return new ApiError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa. Hãy liên hệ người quản trị.");
    if (code === "auth/user-not-found") return new ApiError(401, "ACCOUNT_NOT_FOUND", "Tài khoản không còn tồn tại. Hãy đăng nhập lại.");
    if (code === "auth/argument-error" || code === "auth/invalid-id-token") {
      return new ApiError(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.");
    }
  }
  if (code === "auth/invalid-credential" || code === "auth/insufficient-permission" || code === "app/invalid-credential") {
    return new ApiError(503, "AUTH_SERVER_CREDENTIALS", "Máy chủ chưa xác thực được với Firebase. Hãy liên hệ người quản trị.");
  }
  if (stage === "initialize") return new ApiError(503, "AUTH_INITIALIZATION_FAILED", "Không khởi tạo được Firebase Admin trên máy chủ. Người quản trị cần kiểm tra bản triển khai.");
  return new ApiError(503, "AUTH_SERVICE_UNAVAILABLE", "Dịch vụ xác thực tạm thời chưa kết nối được. Hãy thử lại sau.");
}
