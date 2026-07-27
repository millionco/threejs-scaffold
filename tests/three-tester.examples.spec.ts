/**
 * three-tester usage examples against the scaffolding app.
 *
 * Patterns covered:
 * - evaluate() for live scene queries
 * - observe() around deterministic step() / Playwright input
 * - readPixels() for SwiftShader-stable color probes
 * - page fixture for DOM / keyboard
 */
import { expect, test, type ThreeTestContext } from "three-tester/playwright";

type DemoCube = {
  positionX: number;
  rotationY: number;
  scaleX: number;
  type: string;
  visible: boolean;
};

const demoCube = ({ scene }: ThreeTestContext): DemoCube => {
  const mesh = scene.getObjectByName("DemoCube");
  if (!mesh) throw new Error("DemoCube must exist");
  return {
    positionX: mesh.position.x,
    rotationY: mesh.rotation.y,
    scaleX: mesh.scale.x,
    type: mesh.type,
    visible: mesh.visible,
  };
};

test("evaluate: read named object state from the live scene", async ({ threejs }) => {
  const cube = await threejs.evaluate(demoCube);
  expect(cube).toMatchObject({ type: "Mesh", visible: true });
});

test("evaluate: pass an argument into the browser selector", async ({ threejs }) => {
  const name = await threejs.evaluate(({ scene }, objectName) => {
    return scene.getObjectByName(objectName)?.name ?? null;
  }, "DemoCube");
  expect(name).toBe("DemoCube");
});

test("step: advance the mocked clock so animations progress", async ({ threejs }) => {
  const before = await threejs.evaluate(demoCube);
  await threejs.step(500);
  const after = await threejs.evaluate(demoCube);
  expect(after.rotationY).toBeGreaterThan(before.rotationY);
});

test("observe: assert a before/after transition around an action", async ({ threejs }) => {
  const motion = await threejs.observe(demoCube, () => threejs.step(750));
  expect(motion.after.rotationY).toBeGreaterThan(motion.before.rotationY);
});

test("observe + page: combine keyboard input with scene assertions", async ({
  page,
  threejs,
}) => {
  const moved = await threejs.observe(demoCube, async () => {
    await page.keyboard.press("ArrowRight");
  });
  expect(moved.after.positionX).toBeGreaterThan(moved.before.positionX);
});

test("observe + page: click the canvas to scale the cube", async ({ page, threejs }) => {
  const scaled = await threejs.observe(demoCube, async () => {
    await page.locator("canvas").click();
  });
  expect(scaled.after.scaleX).toBeGreaterThan(scaled.before.scaleX);
});

test("page + observe: Space pauses and resumes the render loop", async ({
  page,
  threejs,
}) => {
  await page.keyboard.press("Space");
  const paused = await threejs.observe(demoCube, () => threejs.step(500));
  expect(paused.after.rotationY).toBe(paused.before.rotationY);

  await page.keyboard.press("Space");
  const resumed = await threejs.observe(demoCube, () => threejs.step(500));
  expect(resumed.after.rotationY).toBeGreaterThan(resumed.before.rotationY);
});

test("readPixels: sample canvas colors under SwiftShader", async ({ threejs }) => {
  await threejs.step(250);
  const pixels = await threejs.readPixels([
    { x: 640, y: 360 },
    { x: 200, y: 200 },
    { x: 1000, y: 500 },
  ]);
  expect(pixels).toHaveLength(3);
  for (const [r, g, b, a] of pixels) {
    expect(a).toBe(255);
    expect(r + g + b).toBeGreaterThan(0);
  }
});
