import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 1,
});

test("renders a healthy canvas without browser errors", async ({ page }) => {
  test.setTimeout(30_000);

  const errors: string[] = [];
  let crashed = false;
  let webglContextLosses = 0;

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("crash", () => {
    crashed = true;
  });

  await page.addInitScript(() => {
    document.addEventListener(
      "webglcontextlost",
      () => {
        Reflect.set(window, "__agentWebglContextLosses", 1);
      },
      true,
    );
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);

  const health = await canvas.evaluate((element) => {
    const candidate = element as HTMLCanvasElement;
    return {
      connected: candidate.isConnected,
      height: candidate.height,
      width: candidate.width,
    };
  });
  webglContextLosses = await page.evaluate(
    () => Number(Reflect.get(window, "__agentWebglContextLosses") ?? 0),
  );

  expect(health).toMatchObject({ connected: true });
  expect(health.width).toBeGreaterThan(0);
  expect(health.height).toBeGreaterThan(0);
  expect(crashed).toBe(false);
  expect(webglContextLosses).toBe(0);
  expect(errors).toEqual([]);
});
