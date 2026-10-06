import { firebaseAdminAuth } from "./firebase-admin";
import { authFailure } from "./auth-failure";
import { ApiError } from "./http";

export async function checkAuthConnection(getUser: (uid: string) => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A fixed synthetic UID tests the same users.get permission required by
    // revocation checks. Never return or log a user record, even if it exists.
    await Promise.race([
      getUser("__notelab_firebase_health_probe__"),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Health timeout")), 10000); }),
    ]);
    return "ready";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") return "ready";
    return error instanceof ApiError ? error.code : authFailure(error, "verify").code;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let cachedCheck: Promise<string> | undefined;
let expires = 0;
export function firebaseAdminConnection() {
  if (cachedCheck && Date.now() < expires) return cachedCheck;
  expires = Date.now() + 60000;
  cachedCheck = (async () => {
    try {
      const auth = firebaseAdminAuth();
      return checkAuthConnection(uid => auth.getUser(uid));
    } catch (error) {
      return error instanceof ApiError ? error.code : "AUTH_INITIALIZATION_FAILED";
    }
  })();
  return cachedCheck;
}
