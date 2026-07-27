import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

describe("scaffolding", () => {
  test("keeps the Vite + Three.js entrypoints", () => {
    for (const path of ["index.html", "vite.config.ts", "src/main.ts", "src/style.css"]) {
      expect(existsSync(join(root, path))).toBe(true);
    }
  });

  test("pins three and vite in package.json", async () => {
    const pkg = await Bun.file(join(root, "package.json")).json();
    expect(pkg.dependencies.three).toBe("0.185.1");
    expect(pkg.devDependencies.vite).toBe("7.3.1");
    expect(pkg.packageManager).toStartWith("bun@");
  });
});
