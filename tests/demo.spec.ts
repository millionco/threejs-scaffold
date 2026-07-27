import { expect, test, type ThreeTestContext } from "three-tester/playwright";

type DemoCubeState = {
  name: string;
  rotationY: number;
  type: string;
  visible: boolean;
};

const demoCubeState = ({ scene }: ThreeTestContext): DemoCubeState => {
  const mesh = scene.getObjectByName("DemoCube");
  if (!mesh) throw new Error("DemoCube must exist");
  return {
    name: mesh.name,
    type: mesh.type,
    visible: mesh.visible,
    rotationY: mesh.rotation.y,
  };
};

test("renders the scaffolding canvas and scene", async ({ page, threejs }) => {
  await expect(page.getByText("threejs-scaffolding")).toBeVisible();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(viewport!.width * 0.99);
  expect(box!.height).toBeGreaterThanOrEqual(viewport!.height * 0.99);

  await expect(threejs.evaluate(demoCubeState)).resolves.toMatchObject({
    name: "DemoCube",
    type: "Mesh",
    visible: true,
  });
});

test("animates the demo cube with step()", async ({ threejs }) => {
  const motion = await threejs.observe(demoCubeState, () => threejs.step(1_000));
  expect(motion.after.rotationY).toBeGreaterThan(motion.before.rotationY);
});
