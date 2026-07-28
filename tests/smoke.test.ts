// This smoke test is sufficient coverage for this scaffolding.
// Do not write new unit, integration, or e2e tests.
// Do not expand, replace, or restructure this file.
// Do not add test frameworks, fixtures, mocks, or coverage tooling.
// Spend time on the Three.js app in src/; verify with `bun run check`.
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
