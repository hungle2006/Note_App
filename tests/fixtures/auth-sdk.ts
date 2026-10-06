// Test-only SDK boundary. This module is bundled only by the browser tests.
const listeners = new Set<(user: unknown) => void>();
let resolveSignIn: (value: unknown) => void;
let rejectSignIn: (error: unknown) => void;
export function onAuthStateChanged(_auth: unknown, callback: (user: unknown) => void) {
  if (new URLSearchParams(location.search).has("init-error")) throw {code: "auth/invalid-api-key"};
  listeners.add(callback);
  queueMicrotask(() => callback(null));
  return () => listeners.delete(callback);
}
export class GoogleAuthProvider { setCustomParameters() {} }
export function signInWithPopup() {
  return new Promise((resolve, reject) => { resolveSignIn = resolve; rejectSignIn = reject; });
}
export const signInWithEmailAndPassword = signInWithPopup;
export const createUserWithEmailAndPassword = signInWithPopup;
export const sendEmailVerification = async () => {};
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async () => {};
export const signOut = async () => { listeners.forEach(callback => callback(null)); };
export function resolveGoogle() { resolveSignIn({user: {uid: "test-student"}}); }
export function rejectGoogle(code: string) { rejectSignIn({code}); }
export function emitUser() { listeners.forEach(callback => callback({uid: "test-student", emailVerified: true})); }
