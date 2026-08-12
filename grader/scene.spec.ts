import { expect, test } from "./fixtures.js";

test("exposes the live Three.js render context", async ({ page, three }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));
  page.on("crash", () => browserErrors.push("page crashed"));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const snapshot = await three(({ camera, renderer, scene }) => ({
    cameraType: camera.type,
    canvas: {
      connected: renderer.domElement.isConnected,
      height: renderer.domElement.height,
      width: renderer.domElement.width,
    },
    frame: renderer.info.render.frame,
    rendererIsWebGl: Reflect.get(renderer, "isWebGLRenderer") === true,
    sceneType: scene.type,
    sceneUuid: scene.uuid,
  }));

  expect(snapshot).toMatchObject({
    cameraType: "PerspectiveCamera",
    canvas: { connected: true },
    rendererIsWebGl: true,
    sceneType: "Scene",
  });
  expect(snapshot.canvas.width).toBeGreaterThan(0);
  expect(snapshot.canvas.height).toBeGreaterThan(0);
  expect(snapshot.frame).toBeGreaterThan(0);
  expect(snapshot.sceneUuid).toMatch(/^[0-9a-f-]{36}$/i);
  expect(browserErrors).toEqual([]);
});

test("keeps rendering the same scene", async ({ page, three }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const first = await three(({ renderer, scene }) => ({
    frame: renderer.info.render.frame,
    sceneUuid: scene.uuid,
  }));

  await expect
    .poll(() => three(({ renderer }) => renderer.info.render.frame), {
      message: "the Three.js render loop should continue producing frames",
      timeout: 5_000,
    })
    .toBeGreaterThan(first.frame);

  const sceneUuid = await three(({ scene }) => scene.uuid);
  expect(sceneUuid).toBe(first.sceneUuid);
});
