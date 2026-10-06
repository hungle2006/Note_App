import { createPrivateKey } from "node:crypto";
import { ApiError } from "./http";

type AuthEnvironment = Record<string, string | undefined>;

export function firebaseAdminConfig(env: AuthEnvironment = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(503, "AUTH_NOT_CONFIGURED", "Máy chủ chưa kết nối Firebase. Hãy liên hệ người quản trị.");
  }
  const publicProject = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (publicProject && publicProject !== projectId) {
    throw new ApiError(503, "AUTH_PROJECT_MISMATCH", "Cấu hình Firebase trên máy chủ và ứng dụng chưa khớp. Hãy liên hệ người quản trị.");
  }
  try {
    // Accept a JSON-quoted PEM copied from a service account, as well as
    // real line breaks or literal \n in a Vercel environment variable.
    if (privateKey.startsWith('"')) {
      const parsed: unknown = JSON.parse(privateKey);
      if (typeof parsed !== "string") throw new Error("Invalid key format");
      privateKey = parsed;
    }
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== "rsa" || !clientEmail.endsWith(".iam.gserviceaccount.com")) {
      throw new Error("Invalid credential format");
    }
  } catch {
    throw new ApiError(503, "AUTH_INVALID_CONFIG", "Thông tin xác thực Firebase trên máy chủ chưa hợp lệ. Hãy liên hệ người quản trị.");
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
    return "invalid" as const;
  }
}
