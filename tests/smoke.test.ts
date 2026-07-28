
import * as fs from "node:fs";
import Path from "node:path";
import { describe, test, expect } from "bun:test";

const root = Path.join(import.meta.dir, "..");

describe("scaffolding", () => {
  test("keeps the Vite + Three.js entrypoints", () => {
    for (const path of ["index.html", "vite.config.ts", "src/main.ts", "src/style.css"]) {
      expect(fs.existsSync(Path.join(root, path))).toBe(true);
    }
  });

  test("pins three and vite in package.json", async () => {
    const pkg = await Bun.file(Path.join(root, "package.json")).json();
    expect(pkg.dependencies.three).toBe("0.185.1");
    expect(pkg.devDependencies.vite).toBe("7.3.1");
    expect(pkg.packageManager).toStartWith("bun@");
  });
});

