import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

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
  webglContextLosses = await page.evaluate(() =>
    Number(Reflect.get(window, "__agentWebglContextLosses") ?? 0),
  );

  expect(health).toMatchObject({ connected: true });
  expect(health.width).toBeGreaterThan(0);
  expect(health.height).toBeGreaterThan(0);
  expect(crashed).toBe(false);
  expect(webglContextLosses).toBe(0);
  expect(errors).toEqual([]);
});

test("capture preserves scenario URLs and waits for readiness with an open request", async () => {
  const directory = await mkdtemp(join(tmpdir(), "capture-scenario-"));
  const server = createServer((request, response) => {
    if (request.url === "/pending") return;
    response.setHeader("Content-Type", "text/html");
    response.end(`<script>
      fetch("/pending");
      const query = new URLSearchParams(location.search);
      if (query.get("scene") === "test" && query.get("debug") === "ao" && query.get("value") === "a=b") {
        setTimeout(() => { document.body.innerHTML = '<div data-scene="test">Ready</div>'; }, 400);
      }
    </script>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server address");
    const url = `http://127.0.0.1:${address.port}/?scene=test&debug=ao&value=a%3Db#camera`;
    const { stdout } = await promisify(execFile)(
      "bun",
      [
        "scripts/capture.mjs",
        `--url=${url}`,
        `--out=${directory}`,
        '--ready=[data-scene="test"]',
        "--at=0",
      ],
      { timeout: 10_000 },
    );
    const result = JSON.parse(stdout);
    expect(result.status).toBe("ok");
    expect(result.requestedUrl).toBe(url);
    expect(result.captures[0].url).toBe(url);
    expect(result.captures[0].bytes).toBeGreaterThan(0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

test("capture seeks a decoded video frame without a custom player or network idle", async ({
  page,
}) => {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    context.fillStyle = "red";
    context.fillRect(0, 0, 64, 64);
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 300));
    context.fillStyle = "lime";
    context.fillRect(0, 0, 64, 64);
    await new Promise((resolve) => setTimeout(resolve, 600));
    context.fillStyle = "blue";
    context.fillRect(0, 0, 64, 64);
    await new Promise((resolve) => setTimeout(resolve, 300));
    recorder.stop();
    await stopped;
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  const directory = await mkdtemp(join(tmpdir(), "capture-video-"));
  const server = createServer((request, response) => {
    if (request.url === "/pending") return;
    if (request.url === "/clip.webm") {
      response.setHeader("Content-Type", "video/webm");
      response.end(Buffer.from(bytes));
      return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(
      '<style>body { margin:0 } video { width:100vw; height:100vh }</style><video src="/clip.webm" muted preload="auto"></video><script>fetch("/pending")</script>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server address");
    const { stdout } = await promisify(execFile)(
      "bun",
      [
        "scripts/capture.mjs",
        `--url=http://127.0.0.1:${address.port}/`,
        `--out=${directory}`,
        "--video-at=0.6",
        "--at=0",
      ],
      { timeout: 10_000 },
    );
    const result = JSON.parse(stdout);
    expect(result.status).toBe("ok");
    expect(result.captures[0].videoTime).toBeCloseTo(0.6, 1);
    const image = await readFile(join(directory, "capture.jpg"));
    const pixel = await page.evaluate(
      async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing canvas context");
        context.drawImage(image, image.width / 2, image.height / 2, 1, 1, 0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      },
      `data:image/jpeg;base64,${image.toString("base64")}`,
    );
    expect(pixel[1]).toBeGreaterThan(200);
    expect(pixel[0]).toBeLessThan(50);
    expect(pixel[2]).toBeLessThan(50);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(directory, { recursive: true, force: true });
  }
});
