import * as BunTest from "bun:test";
import * as fs from "node:fs";
import Path from "node:path";

const root = Path.join(import.meta.dir, "..");

BunTest.describe("scaffolding", () => {
  BunTest.test("keeps the Vite + Three.js entrypoints", () => {
    for (const path of ["index.html", "vite.config.ts", "src/main.ts", "src/style.css"]) {
      BunTest.expect(fs.existsSync(Path.join(root, path))).toBe(true);
    }
  });

  BunTest.test("pins three, vite, and three-tester in package.json", async () => {
    const pkg = await Bun.file(Path.join(root, "package.json")).json();
    BunTest.expect(pkg.dependencies.three).toBe("0.185.1");
    BunTest.expect(pkg.devDependencies.vite).toBe("7.3.1");
    BunTest.expect(pkg.devDependencies["@playwright/test"]).toBe("1.61.1");
    BunTest.expect(pkg.devDependencies["three-tester"]).toBe("file:./three-tester-0.1.0.tgz");
    BunTest.expect(pkg.packageManager).toStartWith("bun@");
    BunTest.expect(fs.existsSync(Path.join(root, "three-tester-0.1.0.tgz"))).toBe(true);
    BunTest.expect(fs.existsSync(Path.join(root, "playwright.config.ts"))).toBe(true);
  });
});
