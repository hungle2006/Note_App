import { firebaseAdminConfig } from "./auth-config";
import { authFailure } from "./auth-failure";

export function firebaseAdminAuth(): import("firebase-admin/auth").Auth {
  const config = firebaseAdminConfig();
  try {
    // Keep CJS loading lazy so Vercel can load route userland synchronously.
    const { cert, getApps, initializeApp } = require("firebase-admin/app") as typeof import("firebase-admin/app");
    const { getAuth } = require("firebase-admin/auth") as typeof import("firebase-admin/auth");
    const app = getApps().find(app => app.name === "notelab-admin") || initializeApp({
      projectId: config.projectId, credential: cert(config),
    }, "notelab-admin");
    return getAuth(app);
  } catch (error) {
    throw authFailure(error, "initialize");
  }
}
