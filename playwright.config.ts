import { defineThreeConfig } from "three-tester/playwright";

export default defineThreeConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  reporter: [["list"]],
});
