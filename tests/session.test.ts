import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { firebaseAdminConfig, firebaseAdminStatus } from "../src/lib/server/auth-config";
import { authFailure } from "../src/lib/server/auth-failure";
import { requireUser } from "../src/lib/server/auth";
import { ApiError } from "../src/lib/server/http";
import { requestWithSession } from "../src/lib/session-request";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" } });
const config = {
  FIREBASE_PROJECT_ID: "test-project",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: privateKey,
};

test("Firebase config accepts real, escaped and JSON-quoted PEM line breaks", () => {
  for (const value of [privateKey, privateKey.replace(/\n/g, "\\n"), JSON.stringify(privateKey), '"' + privateKey + '"']) {
    assert.equal(firebaseAdminConfig({ ...config, FIREBASE_PRIVATE_KEY: value }).privateKey, privateKey.trim());
  }
  assert.equal(firebaseAdminStatus(config), "ready");
});
test("a pasted service account JSON is accepted only when project and email match", () => {
  const account = { type: "service_account", project_id: config.FIREBASE_PROJECT_ID,
    client_email: config.FIREBASE_CLIENT_EMAIL, private_key: privateKey };
  assert.equal(firebaseAdminConfig({ ...config, FIREBASE_PRIVATE_KEY: JSON.stringify(account) }).privateKey, privateKey.trim());
  for (const changed of [{ ...account, project_id: "other-project" }, { ...account, client_email: "other@test-project.iam.gserviceaccount.com" }]) {
    assert.throws(() => firebaseAdminConfig({ ...config, FIREBASE_PRIVATE_KEY: JSON.stringify(changed) }), (error: unknown) => error instanceof ApiError && error.code === "AUTH_INVALID_PRIVATE_KEY");
  }
  assert.equal(firebaseAdminConfig({ ...config, FIREBASE_PROJECT_ID: '"test-project"', FIREBASE_CLIENT_EMAIL: '"' + config.FIREBASE_CLIENT_EMAIL + '"' }).projectId, "test-project");
});
test("Firebase config detects missing, malformed and mismatched credentials without exposing secrets", () => {
  for (const [env, code, status] of [
    [{ ...config, FIREBASE_PRIVATE_KEY: "" }, "AUTH_NOT_CONFIGURED", "missing"],
    [{ ...config, FIREBASE_PRIVATE_KEY: "secret-invalid-key" }, "AUTH_INVALID_PRIVATE_KEY", "invalid-private-key"],
    [{ ...config, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "another-project" }, "AUTH_PROJECT_MISMATCH", "project-mismatch"],
    [{ ...config, FIREBASE_CLIENT_EMAIL: "someone@example.com" }, "AUTH_INVALID_CLIENT_EMAIL", "invalid-client-email"],
  ] as const) {
    assert.throws(() => firebaseAdminConfig(env), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 503);
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /secret-invalid-key|BEGIN PRIVATE KEY|another-project/);
      return true;
    });
    assert.equal(firebaseAdminStatus(env), status);
  }
});
test("token errors distinguish expiry, revocation, invalid JWTs and disabled accounts", () => {
  for (const [sdkCode, status, code] of [
    ["auth/id-token-expired", 401, "TOKEN_EXPIRED"],
    ["auth/id-token-revoked", 401, "TOKEN_REVOKED"],
    ["auth/argument-error", 401, "INVALID_TOKEN"],
    ["auth/invalid-id-token", 401, "INVALID_TOKEN"],
    ["auth/user-disabled", 403, "ACCOUNT_DISABLED"],
    ["auth/user-not-found", 401, "ACCOUNT_NOT_FOUND"],
  ] as const) {
    const error = authFailure({ code: sdkCode, message: "private backend detail" }, "verify");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    assert.doesNotMatch(error.message, /private backend detail/);
  }
});
test("Firebase credential, permission and network failures are server errors, not expired sessions", () => {
  for (const sdkCode of ["auth/invalid-credential", "auth/insufficient-permission", "app/invalid-credential"]) {
    assert.equal(authFailure({ code: sdkCode }, "verify").code, "AUTH_SERVER_CREDENTIALS");
    assert.equal(authFailure({ code: sdkCode }, "verify").status, 503);
  }
  assert.equal(authFailure({ code: "auth/argument-error" }, "initialize").status, 503);
  assert.equal(authFailure(new Error("network secret detail"), "verify").code, "AUTH_SERVICE_UNAVAILABLE");
});
test("unauthenticated API requests fail before reading server credentials", async () => {
  await assert.rejects(requireUser(new Request("https://example.test/api/notes")), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "UNAUTHENTICATED");
    assert.equal(error.status, 401);
    return true;
  });
});

function fixture(responses: Response[]) {
  const refreshes: (boolean | undefined)[] = [];
  const calls: RequestInit[] = [];
  const user = { uid: "student", getIdToken: async (refresh?: boolean) => {
    refreshes.push(refresh); return refresh ? "fresh-token" : "old-token";
  } };
  const dependencies = { currentUser: () => user,
    fetch: (async (_url: unknown, options: RequestInit) => {
      calls.push(options);
      const response = responses.shift();
      assert.ok(response, "Unexpected extra request");
      return response;
    }) as typeof fetch };
  return { user, dependencies, refreshes, calls };
}
const expired = () => Response.json({ code: "TOKEN_EXPIRED", error: "expired" }, { status: 401 });

test("expired tokens refresh once and replay a JSON request with the fresh protected auth header", async () => {
  const f = fixture([expired(), Response.json({ saved: true })]);
  const body = JSON.stringify({ title: "Bài học" });
  assert.deepEqual(await requestWithSession("/api/notes", { method: "POST", body,
    headers: new Headers({ "X-Test": "kept", Authorization: "injected-token" }) }, f.dependencies), { saved: true });
  assert.deepEqual(f.refreshes, [false, true]);
  assert.equal(f.calls.length, 2);
  assert.equal(new Headers(f.calls[0].headers).get("Authorization"), "Bearer old-token");
  assert.equal(new Headers(f.calls[1].headers).get("Authorization"), "Bearer fresh-token");
  assert.equal(new Headers(f.calls[1].headers).get("X-Test"), "kept");
  assert.equal(f.calls[1].body, body);
});
test("a second expired response stops instead of entering a retry loop", async () => {
  const f = fixture([expired(), expired()]);
  await assert.rejects(requestWithSession("/api/notes", {}, f.dependencies), /expired/);
  assert.deepEqual(f.refreshes, [false, true]);
  assert.equal(f.calls.length, 2);
});
test("revoked, disabled, invalid and server-failed sessions never trigger a token refresh", async () => {
  for (const [status, code] of [[401, "TOKEN_REVOKED"], [403, "ACCOUNT_DISABLED"], [401, "INVALID_TOKEN"], [503, "AUTH_SERVER_CREDENTIALS"]] as const) {
    const f = fixture([Response.json({ code, error: "action needed" }, { status })]);
    await assert.rejects(requestWithSession("/api/notes", {}, f.dependencies), /action needed/);
    assert.deepEqual(f.refreshes, [false]);
    assert.equal(f.calls.length, 1);
  }
});
test("logout during a response prevents retrying with the previous student's identity", async () => {
  const f = fixture([expired()]);
  let current: typeof f.user | null = f.user;
  const dependencies = { ...f.dependencies, currentUser: () => current,
    fetch: (async () => { current = null; return expired(); }) as typeof fetch };
  await assert.rejects(requestWithSession("/api/notes", {}, dependencies), /đã thay đổi/);
  assert.deepEqual(f.refreshes, [false]);
});
test("logout while the SDK returns a token prevents sending it to the API", async () => {
  let current: { uid: string; getIdToken: () => Promise<string> } | null;
  current = { uid: "student", getIdToken: async () => { current = null; return "old-token"; } };
  let calls = 0;
  await assert.rejects(requestWithSession("/api/notes", {}, { currentUser: () => current,
    fetch: (async () => { calls++; return Response.json({}); }) as typeof fetch }), /đã thay đổi/);
  assert.equal(calls, 0);
});
