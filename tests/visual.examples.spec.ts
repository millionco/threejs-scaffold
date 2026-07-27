/**
 * Visual verifier examples (`captureVisualObjects`) from the vt-minis three-tester.
 *
 * Captures verifier-only beauty + object-ID renders against the live scene,
 * returning per-object masks, bounds, centroids, density, and sampled color
 * without mutating application materials.
 */
import {
  expect,
  test,
  type ThreeVisualObject,
} from "three-tester/playwright";

test("captureVisualObjects: frame stats and DemoCube mask", async ({ threejs }) => {
  const before = await threejs.evaluate(({ camera, scene }) => {
    const cube = scene.getObjectByName("DemoCube") as
      | { material: { type: string } | Array<{ type: string }>; type: string; uuid: string }
      | undefined;
    if (!cube || cube.type !== "Mesh") throw new Error("DemoCube must exist");
    const material = Array.isArray(cube.material) ? cube.material[0] : cube.material;
    return {
      cameraType: camera.type,
      materialType: material?.type,
      uuid: cube.uuid,
    };
  });
  const snapshot = await threejs.captureVisualObjects({ minimumPixelCount: 4 });
  const cube = snapshot.objects.find(
    (object: ThreeVisualObject) => object.uuid === before.uuid,
  );
  const afterMaterial = await threejs.evaluate(({ scene }) => {
    const mesh = scene.getObjectByName("DemoCube") as
      | { material: { type: string } | Array<{ type: string }>; type: string }
      | undefined;
    if (!mesh || mesh.type !== "Mesh") return null;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    return material?.type ?? null;
  });

  expect(before.cameraType).toBe("PerspectiveCamera");
  expect(snapshot).toMatchObject({
    frame: {
      luminanceHistogram: expect.any(Array),
      meanColor: {
        b: expect.any(Number),
        g: expect.any(Number),
        r: expect.any(Number),
      },
      pixelCount: 1280 * 720,
    },
    height: 720,
    rendererIndex: 0,
    width: 1280,
  });
  expect(snapshot.frame.luminanceHistogram).toHaveLength(256);
  expect(
    snapshot.frame.luminanceHistogram.reduce(
      (total: number, pixelCount: number) => total + pixelCount,
      0,
    ),
  ).toBe(snapshot.frame.pixelCount);

  expect(cube).toBeDefined();
  expect(cube).toMatchObject({
    captureId: expect.any(Number),
    kind: "mesh",
    type: "Mesh",
    visible: true,
  });
  expect(cube!.pixelCount).toBeGreaterThan(200);
  expect(cube!.bounds).not.toBeNull();
  expect(cube!.bounds!.width).toBeGreaterThan(20);
  expect(cube!.bounds!.height).toBeGreaterThan(20);
  expect(cube!.density).toBeGreaterThan(0.2);
  expect(cube!.meanColor).not.toBeNull();
  expect(cube!.meanColor!.r).toBeGreaterThanOrEqual(0);
  expect(cube!.meanColor!.r).toBeLessThanOrEqual(255);
  expect(cube!.projectedPosition).toMatchObject({
    x: expect.any(Number),
    y: expect.any(Number),
    z: expect.any(Number),
  });
  expect(afterMaterial).toBe(before.materialType);
});

test("captureVisualObjects: captureId stays stable across steps", async ({ threejs }) => {
  const uuid = await threejs.evaluate(
    ({ scene }) => scene.getObjectByName("DemoCube")?.uuid ?? null,
  );
  expect(uuid).not.toBeNull();

  const before = await threejs.captureVisualObjects({ minimumPixelCount: 4 });
  const beforeCube = before.objects.find(
    (object: ThreeVisualObject) => object.uuid === uuid,
  );
  expect(beforeCube).toBeDefined();

  await threejs.step(500);

  const after = await threejs.captureVisualObjects({ minimumPixelCount: 4 });
  const afterCube = after.objects.find(
    (object: ThreeVisualObject) => object.uuid === uuid,
  );
  expect(afterCube).toBeDefined();
  expect(afterCube!.captureId).toBe(beforeCube!.captureId);
  expect(afterCube!.pixelCount).toBeGreaterThan(0);
});

test("captureVisualObjects: includeOccluded keeps zero-pixel objects", async ({
  threejs,
}) => {
  const visible = await threejs.captureVisualObjects({ minimumPixelCount: 4 });
  const withOccluded = await threejs.captureVisualObjects({
    includeOccluded: true,
    minimumPixelCount: 1,
  });

  expect(withOccluded.objects.length).toBeGreaterThanOrEqual(visible.objects.length);
  for (const object of withOccluded.objects) {
    expect(object.projectedPosition).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
    });
    expect(object.worldPosition).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
    });
  }
});

test("captureVisualObjects: rejects invalid options before capturing", async ({
  threejs,
}) => {
  await expect(
    threejs.captureVisualObjects({ rendererIndex: -1 }),
  ).rejects.toThrow("non-negative integer");
  await expect(
    threejs.captureVisualObjects({ minimumPixelCount: 0 }),
  ).rejects.toThrow("positive integer");
  await expect(
    threejs.captureVisualObjects({ includeOccluded: "yes" as unknown as boolean }),
  ).rejects.toThrow("must be a boolean");
});
