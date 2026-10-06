import {test, expect} from "@playwright/test";
import {build} from "esbuild";
import path from "node:path";
import {readFile} from "node:fs/promises";

let fixture: string;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, "../..");
  const sdk = path.join(root, "tests/fixtures/auth-sdk.ts");
  const result = await build({
    entryPoints: [path.join(root, "tests/fixtures/auth-page.tsx")],
    bundle: true, write: false, jsx: "automatic", platform: "browser", minify: true,
    plugins: [{name: "mock-auth-boundaries", setup(builder) {
      builder.onResolve({filter: /^firebase\/auth$/}, () => ({path: sdk}));
      builder.onResolve({filter: /^(@\/lib\/firebase|next\/navigation|next\/link)$/}, args => ({path: args.path, namespace: "auth-fixture"}));
      builder.onLoad({filter: /.*/, namespace: "auth-fixture"}, args => {
        const contents = args.path === "@/lib/firebase"
          ? `export {authError} from ${JSON.stringify(path.join(root, "src/lib/auth-errors.ts"))}; export const firebaseConfigured=true; export const firebaseAuth=()=>({currentUser:null});`
          : args.path === "next/navigation"
            ? `const router={replace:url=>{location.hash=url},push:url=>{location.hash=url}};export const useRouter=()=>router;`
            : `import {createElement} from 'react';export default function Link({href,children,...props}){return createElement('a',{href,...props},children)}`;
        return {contents, loader: "js", resolveDir: root};
      });
    }}],
  });
  const css = await readFile(path.join(root, "src/app/globals.css"), "utf8");
  fixture = `<!doctype html><html lang="vi"><head><style>${css}</style></head><body><div id="root"></div><script>${result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
});
test.beforeEach(async ({page}) => {
  await page.route("**/__auth-fixture*", route => route.fulfill({contentType: "text/html", body: fixture}));
  await page.goto("/__auth-fixture");
});

test("Google waits for AuthProvider before routing, with its own busy state", async ({page}) => {
  await page.getByRole("button", {name: "Tiếp tục với Google", exact: true}).click();
  const google = page.getByRole("button", {name: "Đang kết nối Google…", exact: true});
  await expect(google).toBeDisabled(); await expect(google).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", {name: "Đăng nhập", exact: true})).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("button", {name: "Đăng nhập", exact: true})).toBeDisabled();
  await page.getByRole("button", {name: "Resolve Google", exact: true}).click();
  await expect(page.getByRole("button", {name: "Tiếp tục với Google", exact: true})).toBeVisible();
  expect(page.url()).not.toContain("#/app");
  await page.getByRole("button", {name: "Emit Firebase user", exact: true}).click();
  await expect(page).toHaveURL(/#\/app$/);
});

for (const [code, message] of [
  ["configuration-not-found", "khởi tạo Authentication"],
  ["unauthorized-domain", "thêm tên miền"],
  ["popup-blocked", "Cho phép cửa sổ bật lên"],
  ["popup-closed-by-user", "trước khi hoàn tất"],
]) {
  test(`Google ${code} is visible above the button and allows retry`, async ({page}) => {
    await page.getByRole("button", {name: "Tiếp tục với Google", exact: true}).click();
    await page.getByRole("button", {name: code, exact: true}).click();
    const alert = page.getByRole("alert"); const google = page.getByRole("button", {name: "Tiếp tục với Google", exact: true});
    await expect(alert).toContainText(message); await expect(google).toBeEnabled();
    expect((await alert.boundingBox())!.y).toBeLessThan((await google.boundingBox())!.y);
    expect(page.url()).not.toContain("#/app");
    await google.click(); await expect(alert).toHaveCount(0);
    await expect(page.getByRole("button", {name: "Đang kết nối Google…", exact: true})).toBeVisible();
  });
}

test("Firebase initialization failures do not crash the login page", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/__auth-fixture?init-error");
  await expect(page.getByRole("alert")).toContainText("Cấu hình dịch vụ đăng nhập chưa hợp lệ");
  await expect(page.getByRole("heading", {level: 1})).toBeVisible();
  expect(errors).toEqual([]);
});
