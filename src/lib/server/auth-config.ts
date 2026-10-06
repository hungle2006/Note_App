import { createPrivateKey } from "node:crypto";
import { ApiError } from "./http";

type AuthEnvironment = Record<string, string | undefined>;
const unquote = (value: string | undefined) => value?.trim().replace(/^"([^"]*)"$/, "$1");

export function firebaseAdminConfig(env: AuthEnvironment = process.env) {
  const projectId = unquote(env.FIREBASE_PROJECT_ID);
  const clientEmail = unquote(env.FIREBASE_CLIENT_EMAIL);
  let privateKey = env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(503, "AUTH_NOT_CONFIGURED", "Máy chủ chưa kết nối Firebase. Hãy liên hệ người quản trị.");
  }
  const publicProject = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (publicProject && publicProject !== projectId) {
    throw new ApiError(503, "AUTH_PROJECT_MISMATCH", "Cấu hình Firebase trên máy chủ và ứng dụng chưa khớp. Hãy liên hệ người quản trị.");
  }
  if (!/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail)) {
    throw new ApiError(503, "AUTH_INVALID_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL trên máy chủ chưa hợp lệ. Hãy kiểm tra giá trị client_email của tài khoản dịch vụ Firebase.");
  }
  try {
    // Accept a JSON-quoted PEM copied from a service account, as well as
    // real line breaks or literal \n in a Vercel environment variable.
    if (privateKey.startsWith('"')) {
      if (!privateKey.endsWith('"')) throw new Error("Invalid key format");
      try {
        const parsed: unknown = JSON.parse(privateKey);
        if (typeof parsed !== "string") throw new Error("Invalid key format");
        privateKey = parsed;
      } catch {
        // Also tolerate outer quotes around a pasted multiline PEM.
        privateKey = privateKey.slice(1, -1);
      }
    } else if (privateKey.startsWith("{")) {
      const account = JSON.parse(privateKey);
      if (account.type !== "service_account" || account.project_id !== projectId || account.client_email !== clientEmail || typeof account.private_key !== "string") {
        throw new Error("Service account does not match configured project and email");
      }
      privateKey = account.private_key as string;
    }
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== "rsa") {
      throw new Error("Invalid credential format");
    }
  } catch {
    throw new ApiError(503, "AUTH_INVALID_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY trên máy chủ chưa hợp lệ. Hãy cập nhật private_key của tài khoản dịch vụ Firebase rồi triển khai lại.");
  }
  return { projectId, clientEmail, privateKey };
}

export function firebaseAdminStatus(env: AuthEnvironment = process.env) {
  try {
    firebaseAdminConfig(env);
    return "ready" as const;
  } catch (error) {
    if (!(error instanceof ApiError)) return "unavailable" as const;
    if (error.code === "AUTH_NOT_CONFIGURED") return "missing" as const;
    if (error.code === "AUTH_PROJECT_MISMATCH") return "project-mismatch" as const;
    if (error.code === "AUTH_INVALID_CLIENT_EMAIL") return "invalid-client-email" as const;
    if (error.code === "AUTH_INVALID_PRIVATE_KEY") return "invalid-private-key" as const;
    return "invalid" as const;
  }
}
