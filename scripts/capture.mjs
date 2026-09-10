// Agent-readable screenshots.
//
// A 1280x720 PNG of a 3D scene is ~700KB, which is ~900KB of base64 once a
// coding agent inlines it into a `read` result. Providers that bill inline
// images as text charge ~250-350k tokens for that, so three screenshots
// overflow a 1M context window. This script captures the same 1280x720 frame
// as a bounded JPEG instead (~50KB, ~20k tokens) and reports the cost of each.
//
// Usage:
//   bun scripts/capture.mjs                       # one 1280x720 frame after 6s
//   bun scripts/capture.mjs --at=2000,8000,15000  # a sequence
//   bun scripts/capture.mjs --name=hud --click    # click canvas first
//
// Flags: --url --out --name --at --width --height --quality --max-kb --click --ready --video-at
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import Path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEFAULTS = {
  url: "http://127.0.0.1:5173/",
  out: "artifacts",
  name: "capture",
  at: [6_000],
  width: 1280,
  height: 720,
  quality: 65,
  maxKb: 180,
  click: false,
};

const parseArgs = (argv) => {
  const options = { ...DEFAULTS };
  for (const arg of argv) {
    const argument = arg.replace(/^--/, "");
    const separator = argument.indexOf("=");
    const rawKey = separator === -1 ? argument : argument.slice(0, separator);
    const value = separator === -1 ? "true" : argument.slice(separator + 1);
    switch (rawKey) {
      case "url":
      case "out":
      case "name":
      case "ready":
        options[rawKey] = value;
        break;
      case "at":
        options.at = value
          .split(",")
          .map((entry) => Number(entry.trim()))
          .filter(Number.isFinite);
        break;
      case "width":
      case "height":
      case "quality":
        options[rawKey] = Number(value);
        break;
      case "max-kb":
        options.maxKb = Number(value);
        break;
      case "video-at":
        options.videoAt = Number(value);
        if (!Number.isFinite(options.videoAt) || options.videoAt < 0) {
          throw new Error("--video-at needs a nonnegative time in seconds");
        }
        break;
      case "click":
        options.click = value !== "false";
        break;
      default:
        throw new Error(`unknown flag: --${rawKey}`);
    }
  }
  if (options.at.length === 0) throw new Error("--at needs at least one millisecond value");
  return options;
};

const isServerUp = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
};

const startDevServer = async (url) => {
  const child = spawn("bun", ["run", "dev"], { cwd: process.cwd(), stdio: "ignore" });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isServerUp(url)) return child;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error(`dev server did not come up at ${url}`);
};

// Step quality down until the encoded frame fits the budget. Re-shooting is
// cheaper than shipping an image that blows up the reader's context window.
const captureWithinBudget = async (page, quality, maxBytes) => {
  const steps = [...new Set([quality, 50, 35, 25, 15])].filter((step) => step <= quality);
  let last = null;
  for (const step of steps) {
    const buffer = await page.screenshot({ type: "jpeg", quality: step });
    last = { buffer, quality: step };
    if (buffer.byteLength <= maxBytes) return { ...last, withinBudget: true };
  }
  return { ...last, withinBudget: false };
};

const costOf = (bytes) => {
  const base64Bytes = Math.ceil(bytes / 3) * 4;
  // Base64 tokenizes at roughly 3.5 characters per token on text-billed providers.
  return { base64Bytes, approxReadTokens: Math.round(base64Bytes / 3.5) };
};

const options = parseArgs(process.argv.slice(2));
const outDir = Path.resolve(options.out);
await mkdir(outDir, { recursive: true });

const errors = [];
const captures = [];
let status = "ok";
let server;
let browser;

try {
  if (!(await isServerUp(options.url))) server = await startDevServer(options.url);
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: 1,
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("crash", () => errors.push("page crashed"));

  await page.goto(options.url, { waitUntil: "domcontentloaded" });
  if (options.ready) await page.locator(options.ready).waitFor({ state: "visible" });
  if (options.videoAt !== undefined) {
    const video = page.locator("video").first();
    await video.waitFor({ state: "attached" });
    await video.evaluate(async (element) => {
      element.pause();
      const response = await fetch(element.currentSrc || element.src);
      if (!response.ok) throw new Error(`Video fetch failed: ${response.status}`);
      element.src = URL.createObjectURL(await response.blob());
      element.load();
    });
    await page.waitForFunction(() => document.querySelector("video")?.readyState >= 1);
    await video.evaluate((element, seconds) => {
      element.pause();
      if (seconds > element.duration) throw new Error("--video-at exceeds video duration");
      element.currentTime = seconds;
    }, options.videoAt);
    await page.waitForFunction((seconds) => {
      const video = document.querySelector("video");
      return (
        video &&
        !video.seeking &&
        video.readyState >= 2 &&
        Math.abs(video.currentTime - seconds) < 0.05
      );
    }, options.videoAt);
  }
  if (options.click) {
    await page
      .locator("canvas")
      .first()
      .click({ position: { x: 8, y: 8 } });
  }

  const timeline = [...options.at].sort((a, b) => a - b);
  let elapsed = 0;
  for (const [index, mark] of timeline.entries()) {
    await page.waitForTimeout(Math.max(0, mark - elapsed));
    elapsed = mark;

    const suffix = timeline.length > 1 ? `-${String(index + 1).padStart(2, "0")}` : "";
    const file = Path.join(outDir, `${options.name}${suffix}.jpg`);
    const shot = await captureWithinBudget(page, options.quality, options.maxKb * 1024);
    await writeFile(file, shot.buffer);

    captures.push({
      path: Path.relative(process.cwd(), file),
      atMs: mark,
      url: page.url(),
      ...(options.videoAt === undefined
        ? {}
        : {
            videoTime: await page
              .locator("video")
              .first()
              .evaluate((video) => video.currentTime),
          }),
      bytes: shot.buffer.byteLength,
      quality: shot.quality,
      withinBudget: shot.withinBudget,
      ...costOf(shot.buffer.byteLength),
    });
  }
} catch (error) {
  status = "failed";
  errors.push(`capture: ${error.message}`);
} finally {
  await browser?.close();
  server?.kill();
}

if (errors.length > 0) status = "failed";
process.stdout.write(
  `${JSON.stringify({ status, requestedUrl: options.url, viewport: `${options.width}x${options.height}`, captures, errors }, null, 2)}\n`,
);
process.exit(status === "ok" ? 0 : 1);
