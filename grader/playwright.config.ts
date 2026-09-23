import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    deviceScaleFactor: 1,
    viewport: { width: 960, height: 540 },
  },
  webServer: {
    command: "bun run dev",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:5173",
  },
});
