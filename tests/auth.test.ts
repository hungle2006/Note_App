import { test } from "node:test";
import assert from "node:assert/strict";
import { authError } from "../src/lib/auth-errors";

test("missing Firebase Authentication configuration gives a setup-specific error", () => {
  assert.match(
    authError({ code: "auth/configuration-not-found" }),
    /khởi tạo Authentication/,
  );
  assert.match(
    authError({ code: "auth/operation-not-allowed" }),
    /bật Google hoặc Email\/Password/,
  );
});
test("domain restrictions and popup failures provide different recovery instructions", () => {
  assert.match(
    authError({ code: "auth/unauthorized-domain" }),
    /thêm tên miền/,
  );
  assert.match(
    authError({ code: "auth/popup-blocked" }),
    /Cho phép cửa sổ bật lên/,
  );
  assert.match(authError({ code: "auth/popup-closed-by-user" }), /thử lại/);
  assert.match(authError({ code: "auth/cancelled-popup-request" }), /đang mở/);
});
test("credential errors do not reveal whether an email exists", () => {
  assert.equal(
    authError({ code: "auth/user-not-found" }),
    authError({ code: "auth/wrong-password" }),
  );
  assert.equal(
    authError({ code: "auth/invalid-credential" }),
    authError({ code: "auth/wrong-password" }),
  );
});
test("auth errors tolerate null and never expose unknown backend details", () => {
  for (const error of [
    null,
    undefined,
    "failure",
    0,
    { code: 404 },
    new Error("secret backend detail"),
    { code: "auth/unknown", message: "secret backend detail" },
  ]) {
    assert.match(authError(error), /Chưa thể đăng nhập/);
    assert.doesNotMatch(authError(error), /secret backend detail/);
  }
});
