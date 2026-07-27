/**
 * Minimal three-tester samples: evaluate, observe/step, page input, visuals.
 */
import {
  expect,
  test,
  type ThreeTestContext,
  type ThreeVisualObject,
} from "three-tester/playwright";

type DemoCube = {
  name: string;
  positionX: number;
  rotationY: number;
  type: string;
  visible: boolean;
};

const demoCube = ({ scene }: ThreeTestContext): DemoCube => {
  const mesh = scene.getObjectByName("DemoCube");
  if (!mesh) throw new Error("DemoCube must exist");
  return {
    name: mesh.name,
    positionX: mesh.position.x,
    rotationY: mesh.rotation.y,
    type: mesh.type,
    visible: mesh.visible,
  };
};

test("evaluate: canvas and DemoCube are present", async ({ page, threejs }) => {
  await expect(page.getByText("threejs-scaffolding")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(threejs.evaluate(demoCube)).resolves.toMatchObject({
    name: "DemoCube",
    type: "Mesh",
    visible: true,
  });
});

test("observe + step: cube rotates over time", async ({ threejs }) => {
  const motion = await threejs.observe(demoCube, () => threejs.step(500));
  expect(motion.after.rotationY).toBeGreaterThan(motion.before.rotationY);
});

test("observe + page: ArrowRight moves the cube", async ({ page, threejs }) => {
  const moved = await threejs.observe(demoCube, async () => {
    await page.keyboard.press("ArrowRight");
  });
  expect(moved.after.positionX).toBeGreaterThan(moved.before.positionX);
});

test("captureVisualObjects: DemoCube has a visible mask", async ({ threejs }) => {
  const uuid = await threejs.evaluate(
    ({ scene }) => scene.getObjectByName("DemoCube")?.uuid ?? null,
  );
  const snapshot = await threejs.captureVisualObjects({ minimumPixelCount: 4 });
  const cube = snapshot.objects.find(
    (object: ThreeVisualObject) => object.uuid === uuid,
  );

  expect(cube).toMatchObject({ kind: "mesh", type: "Mesh", visible: true });
  expect(cube!.pixelCount).toBeGreaterThan(200);
});
