import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export { authError } from "./auth-errors";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};
export const firebaseConfigured = Object.values(config).every(Boolean);

export function firebaseAuth() {
  if (!firebaseConfigured)
    throw new Error("Dịch vụ tài khoản chưa được kết nối.");
  const app = getApps().some((app) => app.name === "[DEFAULT]")
    ? getApp()
    : initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = "vi";
  return auth;
}
