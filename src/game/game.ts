import * as THREE from "three";
import { instance, loadModel } from "./assets";

export interface GameCallbacks {
  onProgress: (cleaned: number, total: number) => void;
  onDone: () => void;
}

interface Cleanable {
  root: THREE.Object3D;
  hitsLeft: number;
  kind: "item" | "stain";
}

const FURNITURE_REF = { name: "kitchenCabinet", height: 0.9 };
const FOOD_REF = { name: "soda-can", height: 0.16 };

async function kitScale(ref: { name: string; height: number }): Promise<number> {
  const g = await loadModel(ref.name);
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(g).getSize(size);
  return size.y > 0 ? ref.height / size.y : 1;
}

function makeRoom(scene: THREE.Scene) {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x9a6f4d, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 7), floorMat);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  scene.add(floor);

  // plank lines
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x8a6244, roughness: 0.9 });
  for (let x = -4; x <= 4; x += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 7), lineMat);
    line.position.set(x + 0.5, 0.001, 0);
    scene.add(line);
  }

  const wallBlue = new THREE.MeshStandardMaterial({ color: 0x5b7fa6, roughness: 0.95 });
  const wallLight = new THREE.MeshStandardMaterial({ color: 0xbcd1e0, roughness: 0.95 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 0.12), wallLight);
  back.position.set(0, 1.6, -3.55);
  back.receiveShadow = true;
  scene.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 7), wallBlue);
  left.position.set(-4.55, 1.6, 0);
  left.receiveShadow = true;
  scene.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 7), wallBlue);
  right.position.set(4.55, 1.6, 0);
  right.receiveShadow = true;
  scene.add(right);

  // wall shelf (top-left)
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.07, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 0.8 }),
  );
  shelf.position.set(-3.4, 1.58, -3.3);
  shelf.castShadow = true;
  scene.add(shelf);

  // window on back wall
  const winFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  winFrame.position.set(2.6, 1.9, -3.47);
  scene.add(winFrame);
  const winGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.1, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xdff1fb, emissive: 0xbfe6f7, emissiveIntensity: 0.6 }),
  );
  winGlass.position.set(2.6, 1.9, -3.44);
  scene.add(winGlass);
}

function makeLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xfff2e0, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4dd, 1.6);
  sun.position.set(4, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe4ff, 0.5);
  fill.position.set(-5, 4, 2);
  scene.add(fill);
}

async function makeFurniture(scene: THREE.Scene) {
  const k = await kitScale(FURNITURE_REF);
  const add = async (
    name: string,
    position: [number, number, number],
    rotationY = 0,
  ) => {
    const g = await instance(name, { position, rotationY });
    g.scale.setScalar(k);
    scene.add(g);
    return g;
  };

  await Promise.all([
    // back wall: counters, stove, sink
    add("kitchenCabinetDrawer", [-2.2, 0, -3.1]),
    add("kitchenCabinet", [-1.2, 0, -3.1]),
    add("kitchenStove", [-0.2, 0, -3.1]),
    add("kitchenCabinet", [0.8, 0, -3.1]),
    add("kitchenSink", [1.8, 0, -3.1]),
    add("kitchenCabinet", [2.8, 0, -3.1]),
    add("kitchenCabinetUpperDouble", [-2.2, 1.7, -3.25]),
    add("kitchenCabinetUpper", [1.0, 1.7, -3.25]),
    add("hoodLarge", [-0.2, 1.7, -3.2]),
    // left wall: fridge
    add("kitchenFridge", [-3.9, 0, -1.4], Math.PI / 2),
    add("kitchenCabinet", [-3.9, 0, -0.2], Math.PI / 2),
    add("kitchenCabinetDrawer", [-3.9, 0, 0.8], Math.PI / 2),
    // island + stools
    add("kitchenBar", [-0.4, 0, -0.6]),
    add("kitchenBar", [0.6, 0, -0.6]),
    add("stoolBar", [-0.4, 0, 0.4]),
    add("stoolBar", [0.6, 0, 0.4]),
    // right wall: door + trash
    add("doorwayFront", [4.42, 0, 1.6], -Math.PI / 2),
    add("trashcan", [3.9, 0, -1.2], -Math.PI / 2),
    // extras
    add("tableRound", [-3.2, 0, 2.6]),
    add("chair", [-2.4, 0, 2.2], Math.PI * 0.75),
    add("rugDoormat", [3.2, 0, 2.2], -Math.PI / 2),
    add("radio", [-3.6, 1.62, -3.25]),
    add("books", [-3.15, 1.62, -3.25]),
    add("pottedPlant", [3.9, 0, 3.0]),
    add("cardboardBoxOpen", [2.6, 0, -2.6]),
  ]);
}

const MESS: Array<{ name: string; at: [number, number, number]; size: number }> = [
  // floor litter
  { name: "soda-can", at: [-2.6, 0, 1.4], size: 0.2 },
  { name: "soda-can-crushed", at: [1.6, 0, 2.6], size: 0.16 },
  { name: "soda-can", at: [2.2, 0, 0.6], size: 0.2 },
  { name: "can-open", at: [-1.6, 0, 2.8], size: 0.2 },
  { name: "can", at: [3.0, 0, -0.6], size: 0.2 },
  { name: "banana", at: [-2.0, 0, 0.4], size: 0.3 },
  { name: "plate-broken", at: [0.4, 0, 2.0], size: 0.4 },
  { name: "candy-bar-wrapper", at: [1.0, 0, 1.2], size: 0.26 },
  { name: "bag-flat", at: [-0.8, 0, 3.0], size: 0.34 },
  { name: "fish-bones", at: [2.4, 0, 1.8], size: 0.4 },
  { name: "carton", at: [-3.2, 0, 1.2], size: 0.3 },
  { name: "pizza-box", at: [1.8, 0, -1.8], size: 0.5 },
  { name: "utensil-fork", at: [0.2, 0, 0.9], size: 0.24 },
  { name: "cup", at: [-1.2, 0, 1.8], size: 0.18 },
  { name: "mug", at: [2.8, 0, 2.8], size: 0.18 },
  // counter mess
  { name: "soda-can", at: [-1.2, 0.95, -2.9], size: 0.2 },
  { name: "honey", at: [0.8, 0.95, -2.9], size: 0.22 },
  { name: "peanut-butter", at: [-2.4, 0.95, -2.9], size: 0.2 },
  { name: "bottle-oil", at: [-0.6, 0.95, -3.0], size: 0.32 },
  { name: "cutting-board", at: [-1.8, 0.95, -3.0], size: 0.4 },
  { name: "cooking-spatula", at: [0.2, 0.95, -2.95], size: 0.3 },
  { name: "cookie", at: [2.6, 0.95, -2.9], size: 0.14 },
  // island mess
  { name: "pot", at: [-0.6, 0.95, -0.7], size: 0.42 },
  { name: "cup-coffee", at: [-0.1, 0.95, -0.5], size: 0.18 },
  { name: "soda-bottle", at: [0.5, 0.95, -0.7], size: 0.3 },
  // fridge-side mess
  { name: "soda-can-crushed", at: [-3.4, 0, 0.2], size: 0.16 },
  { name: "whisk", at: [-3.0, 0, -0.6], size: 0.3 },
];

const STAINS: Array<{
  tex: string;
  at: [number, number, number];
  size: number;
  rot?: [number, number, number];
  color: number;
}> = [
  { tex: "splat00", at: [1.2, 0.012, 0.2], size: 1.1, color: 0x6b4a32 },
  { tex: "splat04", at: [-1.6, 0.012, 2.0], size: 0.9, color: 0x7a9a4a },
  { tex: "splat07", at: [2.6, 0.012, 2.2], size: 1.0, color: 0x8a5a86 },
  { tex: "splat10", at: [-2.8, 0.012, 2.9], size: 0.8, color: 0x6b4a32 },
  { tex: "splat13", at: [3.2, 0.012, -1.4], size: 0.9, color: 0x7a9a4a },
  { tex: "splat16", at: [-0.4, 0.012, 1.6], size: 0.7, color: 0x4a6d8a },
  // wall stains
  { tex: "splat01", at: [-1.0, 1.8, -3.48], size: 0.9, rot: [0, 0, 0.4], color: 0x6b4a32 },
  { tex: "splat19", at: [3.0, 2.3, -3.48], size: 0.8, rot: [0, 0, -0.7], color: 0x6b4a32 },
  { tex: "splat22", at: [-4.48, 2.0, 1.6], size: 0.9, rot: [0, Math.PI / 2, 0.2], color: 0x5a4632 },
];

export async function startGame(canvas: HTMLCanvasElement, cb: GameCallbacks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2e2833);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(4.6, 4.2, 5.6);
  camera.lookAt(-0.6, 0.5, -0.8);

  makeLights(scene);
  makeRoom(scene);
  await makeFurniture(scene);

  const cleanables: Cleanable[] = [];
  const foodK = await kitScale(FOOD_REF);
  void foodK;

  await Promise.all(
    MESS.map(async (m) => {
      const g = await instance(m.name, {
        position: m.at,
        rotationY: Math.random() * Math.PI * 2,
        fitSize: m.size,
      });
      scene.add(g);
      cleanables.push({ root: g, hitsLeft: 1, kind: "item" });
    }),
  );

  const texLoader = new THREE.TextureLoader();
  for (const s of STAINS) {
    const tex = texLoader.load(`/decals/${s.tex}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: s.color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(s.size, s.size), mat);
    if (s.rot) plane.rotation.set(...s.rot);
    else plane.rotation.x = -Math.PI / 2;
    plane.position.set(...s.at);
    scene.add(plane);
    cleanables.push({ root: plane, hitsLeft: 3, kind: "stain" });
  }

  const total = cleanables.length;
  let cleaned = 0;
  cb.onProgress(0, total);

  interface Pop {
    obj: THREE.Object3D;
    t: number;
    entry: Cleanable;
  }
  const pops: Pop[] = [];

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pick(e: PointerEvent): Cleanable | null {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const active = cleanables.filter((c) => c.hitsLeft > 0);
    const hits = ray.intersectObjects(
      active.map((c) => c.root),
      true,
    );
    const first = hits[0];
    if (!first) return null;
    let obj: THREE.Object3D | null = first.object;
    while (obj) {
      const found = active.find((c) => c.root === obj);
      if (found) return found;
      obj = obj.parent;
    }
    return null;
  }

  function onPointerDown(e: PointerEvent) {
    const c = pick(e);
    if (!c) return;
    c.hitsLeft -= 1;
    if (c.kind === "stain") {
      const mesh = c.root as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 * (c.hitsLeft / 3);
    }
    if (c.hitsLeft <= 0) {
      cleaned += 1;
      cb.onProgress(cleaned, total);
      pops.push({ obj: c.root, t: 0, entry: c });
      if (cleaned >= total) cb.onDone();
    }
  }

  function onPointerMove(e: PointerEvent) {
    canvas.style.cursor = pick(e) ? "pointer" : "default";
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);

  let disposed = false;
  const clock = new THREE.Clock();

  function frame() {
    if (disposed) return;
    const dt = clock.getDelta();
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      if (!p) continue;
      p.t += dt * 3;
      const s = Math.max(0, 1 - p.t);
      p.obj.scale.multiplyScalar(s > 0 ? 0.9 : 0);
      p.obj.position.y += dt * 0.8;
      if (p.t >= 1) {
        scene.remove(p.obj);
        pops.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener("resize", onResize);
  requestAnimationFrame(frame);

  return () => {
    disposed = true;
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    removeEventListener("resize", onResize);
    renderer.dispose();
  };
}
