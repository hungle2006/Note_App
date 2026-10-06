import { test, expect } from "@playwright/test";

test("Vietnamese regular and italic fonts load locally without breaking math", async ({
  page,
}) => {
  const fontFailures: string[] = [];
  page.on("requestfailed", (request) => {
    if (/\.woff2/.test(request.url())) fontFailures.push(request.url());
  });
  await page.goto("/");
  const fonts = await page.evaluate(async () => {
    const vietnamese =
      "Mỗi trang vở, một vũ trụ mới. Để mỗi điều bạn học đều trở nên đáng nhớ.";
    await document.fonts.load('650 20px "Nunito Sans Variable"', vietnamese);
    await document.fonts.load('italic 400 32px "Lora Variable"', vietnamese);
    return {
      sans: document.fonts.check('650 20px "Nunito Sans Variable"', vietnamese),
      serif: document.fonts.check(
        'italic 400 32px "Lora Variable"',
        vietnamese,
      ),
      body: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(fonts.sans).toBe(true);
  expect(fonts.serif).toBe(true);
  expect(fonts.body).toContain("Nunito Sans Variable");
  expect(fontFailures).toEqual([]);
  await page.goto("/app?mode=demo&view=library");
  await page
    .locator(".note-card")
    .filter({ hasText: "Cộng và rút gọn phân số" })
    .click();
  await expect(page.locator(".katex").first()).toBeVisible();
  expect(
    await page
      .locator(".katex .mathnormal")
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("KaTeX");
});

test("headings and auth buttons stay inside narrow viewports in both themes", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/login", "/register", "/app?mode=demo"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (let theme = 0; theme < 2; theme++) {
        const size = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          viewport: innerWidth,
        }));
        expect(size.scroll, `${path}, width=${width}`).toBeLessThanOrEqual(
          size.viewport,
        );
        const heading = await page
          .getByRole("heading", { level: 1 })
          .boundingBox();
        expect(heading!.x).toBeGreaterThanOrEqual(0);
        expect(heading!.x + heading!.width).toBeLessThanOrEqual(width);
        const toggle = page.getByRole("button", {
          name: /Chuyển sang giao diện (sáng|tối)/,
        });
        await toggle.click();
      }
    }
  }
});
