import { ApiError } from "./http";

export function authFailure(error: unknown, stage: "initialize" | "verify") {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code : "";
  if (stage === "verify") {
    if (code === "auth/id-token-expired") return new ApiError(401, "TOKEN_EXPIRED", "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.");
    if (code === "auth/id-token-revoked") return new ApiError(401, "TOKEN_REVOKED", "Phiên đăng nhập đã bị thu hồi. Hãy đăng nhập lại.");
    if (code === "auth/user-disabled") return new ApiError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa. Hãy liên hệ người quản trị.");
    if (code === "auth/user-not-found") return new ApiError(401, "ACCOUNT_NOT_FOUND", "Tài khoản không còn tồn tại. Hãy đăng nhập lại.");
    if (code === "auth/argument-error" || code === "auth/invalid-id-token") {
      return new ApiError(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.");
    }
  }
  if (stage === "initialize" || code === "auth/invalid-credential" || code === "auth/insufficient-permission" || code === "app/invalid-credential") {
    return new ApiError(503, "AUTH_SERVER_CREDENTIALS", "Máy chủ chưa xác thực được với Firebase. Hãy liên hệ người quản trị.");
  }
  return new ApiError(503, "AUTH_SERVICE_UNAVAILABLE", "Dịch vụ xác thực tạm thời chưa kết nối được. Hãy thử lại sau.");
}
