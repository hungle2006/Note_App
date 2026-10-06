import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";

test("native browser fetch survives expired-token refresh without Illegal invocation", async ({ page }) => {
  const bundle = await build({ entryPoints: [path.resolve("src/lib/session-request.ts")], bundle: true,
    write: false, format: "iife", globalName: "SessionRequest", platform: "browser" });
  await page.route("**/__session-fixture", route => route.fulfill({ contentType: "text/html",
    body: `<html><body>Session fixture<script>${bundle.outputFiles[0].text}</script></body></html>` }));
  const tokens: string[] = [];
  await page.route("**/__session-api", async route => {
    tokens.push(route.request().headers().authorization);
    await route.fulfill({ status: tokens.length === 1 ? 401 : 200, contentType: "application/json",
      body: JSON.stringify(tokens.length === 1 ? { code: "TOKEN_EXPIRED" } : { saved: true }) });
  });
  await page.goto("/__session-fixture");
  const result = await page.evaluate(async () => {
    const refreshes: boolean[] = [];
    const user = { uid: "test-student", getIdToken: async (force = false) => {
      refreshes.push(force); return force ? "fresh-test-token" : "old-test-token";
    } };
    const session = (window as unknown as { SessionRequest: { requestWithSession: Function } }).SessionRequest;
    const data = await session.requestWithSession("/__session-api", {}, { currentUser: () => user, fetch: window.fetch });
    return { data, refreshes };
  });
  expect(result).toEqual({ data: { saved: true }, refreshes: [false, true] });
  expect(tokens).toEqual(["Bearer old-test-token", "Bearer fresh-test-token"]);
});
