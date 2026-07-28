import Path from "node:path";
import { expect, test } from "@playwright/test";

test("runs for five seconds without errors or crashes", async ({ page }) => {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`page: ${error.message}`);
  });
  page.on("crash", () => {
    errors.push("page crashed");
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(5_000);
  const screenshotPath = Path.resolve("artifacts/smoke.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  expect(page.isClosed()).toBe(false);
  expect(errors).toEqual([]);
});

