import * as THREE from "three";
import { instance, loadModel } from "./assets";
import { dripTexture, floorTexture, panelingTexture, wallpaperTexture } from "./textures";

export interface GameCallbacks {
  onProgress: (cleaned: number, total: number) => void;
  onDone: () => void;
}

interface Cleanable {
  root: THREE.Object3D;
  hitsLeft: number;
  maxHits: number;
  kind: "item" | "stain";
}

const FURNITURE_REF = { name: "kitchenCabinet", height: 0.9 };

async function kitScale(ref: { name: string; height: number }): Promise<number> {
  const g = await loadModel(ref.name);
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(g).getSize(size);
  return size.y > 0 ? ref.height / size.y : 1;
}

function recolor(root: THREE.Object3D, color: number) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mat = (o.material as THREE.MeshStandardMaterial).clone();
      mat.color = new THREE.Color(color);
      o.material = mat;
    }
  });
}

function makeRoom(scene: THREE.Scene) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.1, 7),
    new THREE.MeshStandardMaterial({ map: floorTexture(5, 4), roughness: 0.9 }),
  );
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  scene.add(floor);

  const paneled = () =>
    new THREE.MeshStandardMaterial({ map: panelingTexture(6, 1), roughness: 0.95 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 0.12), paneled());
  back.position.set(0, 2.2, -3.55);
  back.receiveShadow = true;
  scene.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.4, 7), paneled());
  left.position.set(-4.55, 2.2, 0);
  left.receiveShadow = true;
  scene.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.4, 7), paneled());
  right.position.set(3.95, 2.2, 0);
  right.receiveShadow = true;
  scene.add(right);

  // wallpaper backsplash behind the counters
  const splash = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.95),
    new THREE.MeshStandardMaterial({ map: wallpaperTexture(5, 1), roughness: 0.95 }),
  );
  splash.position.set(-0.9, 1.36, -3.48);
  scene.add(splash);

  // wall shelf (top-left)
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 0.8 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.4), shelfMat);
  shelf.position.set(-3.4, 1.58, -3.3);
  shelf.castShadow = true;
  scene.add(shelf);
  const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.4), shelfMat);
  shelf2.position.set(-3.4, 2.2, -3.3);
  shelf2.castShadow = true;
  scene.add(shelf2);

  // cottage window with cross bars
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f2ec });
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.1), white);
  winFrame.position.set(2.6, 1.95, -3.47);
  scene.add(winFrame);
  const winGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 1.22, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xe8f4fb, emissive: 0xcbe8f5, emissiveIntensity: 0.7 }),
  );
  winGlass.position.set(2.6, 1.95, -3.44);
  scene.add(winGlass);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.22, 0.07), white);
  barV.position.set(2.6, 1.95, -3.43);
  scene.add(barV);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.07), white);
  barH.position.set(2.6, 1.95, -3.43);
  scene.add(barH);
  // window sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.25), white);
  sill.position.set(2.6, 1.24, -3.42);
  scene.add(sill);

  // wooden door with 3 frosted panes on the right wall
  const door = new THREE.Group();
  const doorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2.5, 1.15),
    new THREE.MeshStandardMaterial({ color: 0x8a5a38, roughness: 0.8 }),
  );
  doorBody.position.y = 1.25;
  doorBody.castShadow = true;
  door.add(doorBody);
  const paneMat = new THREE.MeshStandardMaterial({
    color: 0xeef4f6,
    emissive: 0xdbe8ec,
    emissiveIntensity: 0.35,
  });
  for (let i = 0; i < 3; i++) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.85), paneMat);
    pane.position.set(0, 1.95 - i * 0.72, 0);
    door.add(pane);
  }
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2c2c34 }),
  );
  handle.position.set(-0.08, 1.15, -0.45);
  door.add(handle);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.62, 1.31),
    new THREE.MeshStandardMaterial({ color: 0x6f4527 }),
  );
  frame.position.y = 1.31;
  door.add(frame);
  frame.renderOrder = -1;
  door.position.set(3.85, 0, 0.1);
  scene.add(door);

  // big white cone extractor hood above the stove
  const hood = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 24), white);
  cone.position.y = 2.05;
  hood.add(cone);
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 16), white);
  duct.position.y = 2.75;
  hood.add(duct);
  hood.position.set(-0.2, 0, -3.0);
  hood.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  scene.add(hood);
}

function makeLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffe8cf, 0.55));
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x6b5a4a, 0.5));
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.35);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbcd4f5, 0.35);
  fill.position.set(-5, 4, 2);
  scene.add(fill);
}

async function makeFurniture(scene: THREE.Scene) {
  const k = await kitScale(FURNITURE_REF);
  const add = async (
    name: string,
    position: [number, number, number],
    rotationY = 0,
    color?: number,
  ) => {
    const g = await instance(name, { position, rotationY });
    g.scale.setScalar(k);
    if (color !== undefined) recolor(g, color);
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
    add("kitchenCabinetUpperDouble", [-2.2, 1.85, -3.25]),
    add("kitchenCabinetUpper", [1.2, 1.85, -3.25]),
    // left wall: fridge (cream) + counters
    add("kitchenFridge", [-3.9, 0, -1.4], Math.PI / 2, 0xf1e5cf),
    add("kitchenCabinet", [-3.9, 0, -0.2], Math.PI / 2),
    add("kitchenCabinetDrawer", [-3.9, 0, 0.8], Math.PI / 2),
    // island + brown stools
    add("kitchenBar", [-0.4, 0, -0.6]),
    add("kitchenBar", [0.6, 0, -0.6]),
    add("stoolBar", [-0.4, 0, 0.45], 0, 0x9a6b45),
    add("stoolBar", [0.6, 0, 0.45], 0, 0x9a6b45),
    // right side
    add("trashcan", [3.3, 0, -1.2], -Math.PI / 2, 0xd8c4a8),
    // extras
    add("rugDoormat", [3.1, 0, 0.2], -Math.PI / 2, 0xc9b18e),
    add("radio", [-3.7, 1.62, -3.25]),
    add("books", [-3.2, 1.62, -3.25]),
    add("books", [-3.5, 2.24, -3.25]),
    add("pottedPlant", [-4.1, 0, 3.1]),
    add("cardboardBoxOpen", [2.4, 0, -2.7]),
  ]);
}

const MESS: Array<{ name: string; at: [number, number, number]; size: number }> = [
  // floor litter
  { name: "soda-can", at: [-2.6, 0, 1.4], size: 0.2 },
  { name: "soda-can-crushed", at: [1.6, 0, 2.6], size: 0.16 },
  { name: "soda-can", at: [2.2, 0, 0.6], size: 0.2 },
  { name: "soda-can", at: [0.2, 0, 2.8], size: 0.2 },
  { name: "soda-can-crushed", at: [-0.9, 0, 2.2], size: 0.16 },
  { name: "can-open", at: [-1.6, 0, 2.8], size: 0.2 },
  { name: "can", at: [3.0, 0, -0.4], size: 0.2 },
  { name: "can", at: [2.9, 0, 2.4], size: 0.2 },
  { name: "can-small", at: [1.9, 0, 1.5], size: 0.16 },
  { name: "banana", at: [-2.0, 0, 0.4], size: 0.3 },
  { name: "plate-broken", at: [0.4, 0, 2.0], size: 0.4 },
  { name: "plate-broken", at: [2.2, 0, 3.0], size: 0.34 },
  { name: "candy-bar-wrapper", at: [1.0, 0, 1.2], size: 0.26 },
  { name: "bag-flat", at: [-0.8, 0, 3.1], size: 0.34 },
  { name: "fish-bones", at: [2.4, 0, 1.8], size: 0.4 },
  { name: "carton", at: [-3.2, 0, 1.2], size: 0.3 },
  { name: "carton", at: [1.4, 0, 0.4], size: 0.24 },
  { name: "pizza-box", at: [1.8, 0, -1.8], size: 0.5 },
  { name: "utensil-fork", at: [0.2, 0, 0.9], size: 0.24 },
  { name: "utensil-spoon", at: [-1.4, 0, 1.0], size: 0.24 },
  { name: "cup", at: [-1.2, 0, 1.8], size: 0.18 },
  { name: "mug", at: [2.8, 0, 2.8], size: 0.18 },
  { name: "mug", at: [-2.9, 0, 2.0], size: 0.18 },
  { name: "cookie", at: [0.9, 0, 2.4], size: 0.14 },
  // counter mess
  { name: "soda-can", at: [-1.2, 0.95, -2.9], size: 0.2 },
  { name: "soda-can", at: [2.7, 0.95, -3.0], size: 0.2 },
  { name: "honey", at: [0.8, 0.95, -2.9], size: 0.22 },
  { name: "peanut-butter", at: [-2.4, 0.95, -2.9], size: 0.2 },
  { name: "bottle-oil", at: [-0.7, 0.95, -3.0], size: 0.32 },
  { name: "cutting-board", at: [-1.8, 0.95, -3.0], size: 0.4 },
  { name: "cooking-spatula", at: [0.2, 0.95, -2.95], size: 0.3 },
  { name: "cookie", at: [2.5, 0.95, -2.85], size: 0.14 },
  { name: "can-open", at: [1.6, 0.95, -2.9], size: 0.2 },
  { name: "pot", at: [-0.35, 0.98, -3.05], size: 0.4 },
  // window sill
  { name: "can-small", at: [2.35, 1.28, -3.35], size: 0.16 },
  { name: "honey", at: [2.85, 1.28, -3.35], size: 0.18 },
  // island mess
  { name: "pan-stew", at: [-0.65, 0.95, -0.7], size: 0.42 },
  { name: "cup-coffee", at: [-0.1, 0.95, -0.5], size: 0.18 },
  { name: "soda-bottle", at: [0.5, 0.95, -0.7], size: 0.3 },
  { name: "soda-can", at: [0.15, 0.95, -0.75], size: 0.18 },
  // fridge-side + shelf mess
  { name: "soda-can-crushed", at: [-3.4, 0, 0.2], size: 0.16 },
  { name: "whisk", at: [-3.0, 0, -0.6], size: 0.3 },
  { name: "bag-flat", at: [3.3, 0, 1.7], size: 0.45 },
  { name: "soda-can", at: [-3.0, 0, 2.4], size: 0.2 },
  { name: "can-open", at: [-2.5, 0, 3.0], size: 0.2 },
  { name: "soda-can", at: [-2.9, 1.65, -3.3], size: 0.2 },
  { name: "can-small", at: [-4.0, 2.27, -3.3], size: 0.16 },
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
  { tex: "splat07", at: [2.6, 0.012, 2.2], size: 1.0, color: 0x8a6a48 },
  { tex: "splat10", at: [-2.8, 0.012, 2.9], size: 0.8, color: 0x6b4a32 },
  { tex: "splat13", at: [3.2, 0.012, -1.4], size: 0.9, color: 0x7a9a4a },
  { tex: "splat16", at: [-0.4, 0.012, 1.6], size: 0.7, color: 0x5e7a42 },
  { tex: "splat01", at: [3.3, 0.012, 0.3], size: 0.9, color: 0x6b4a32 },
  // wall stains
  { tex: "splat01", at: [-1.0, 2.3, -3.48], size: 0.9, rot: [0, 0, 0.4], color: 0x6b4a32 },
  { tex: "splat19", at: [3.4, 2.5, -3.48], size: 0.8, rot: [0, 0, -0.7], color: 0x6b4a32 },
  { tex: "splat22", at: [-4.48, 2.0, 1.6], size: 0.9, rot: [0, Math.PI / 2, 0.2], color: 0x5a4632 },
];

/** goo drips running down surfaces; [x,y,z], facing determines plane orientation */
const DRIPS: Array<{
  at: [number, number, number];
  w: number;
  h: number;
  face: "z" | "x" | "-x";
}> = [
  { at: [-0.9, 2.55, -3.47], w: 1.4, h: 1.0, face: "z" }, // back wall over cabinets
  { at: [2.0, 2.75, -3.47], w: 1.0, h: 0.8, face: "z" }, // back wall right
  { at: [3.83, 2.4, -0.1], w: 1.1, h: 1.1, face: "-x" }, // over the door
  { at: [-4.48, 2.6, -0.4], w: 1.2, h: 0.9, face: "x" }, // left wall
  { at: [0.1, 0.86, -0.06], w: 0.7, h: 0.7, face: "z" }, // island front
];

/** viscous green puddles built from flattened blobs */
const PUDDLES: Array<{ at: [number, number, number]; s: number }> = [
  { at: [2.9, 0, 0.2], s: 1.0 },
  { at: [-2.3, 0, 2.5], s: 0.8 },
  { at: [1.0, 0, 3.0], s: 0.7 },
];

const NOTES: Array<{ at: [number, number, number]; face: "x" | "z"; color: number }> = [
  { at: [-3.52, 1.55, -1.55], face: "x", color: 0xf6d976 },
  { at: [-3.52, 1.1, -1.2], face: "x", color: 0xf4a9c0 },
  { at: [-3.52, 0.65, -1.5], face: "x", color: 0xf6d976 },
  { at: [3.05, 0.6, -0.9], face: "x", color: 0xf4a9c0 },
  { at: [-1.35, 0.55, -2.63], face: "z", color: 0xf6d976 },
];

/** crumb/dirt scatter clusters */
const CRUMBS: Array<{ at: [number, number, number]; n: number; spread: number }> = [
  { at: [3.1, 0, 1.7], n: 8, spread: 0.5 }, // dirt trail by the door
  { at: [2.7, 0, 1.1], n: 6, spread: 0.4 },
  { at: [-0.4, 0, 1.9], n: 5, spread: 0.35 },
  { at: [1.5, 0, -0.9], n: 5, spread: 0.4 },
];

export async function startGame(canvas: HTMLCanvasElement, cb: GameCallbacks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2530);

  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(2.2, 2.8, 4.5);
  camera.lookAt(0.2, 1.1, -1.2);

  makeLights(scene);
  makeRoom(scene);
  await makeFurniture(scene);

  const cleanables: Cleanable[] = [];
  const track = (root: THREE.Object3D, hits: number, kind: Cleanable["kind"]) =>
    cleanables.push({ root, hitsLeft: hits, maxHits: hits, kind });

  await Promise.all(
    MESS.map(async (m) => {
      const g = await instance(m.name, {
        position: m.at,
        rotationY: Math.random() * Math.PI * 2,
        fitSize: m.size,
      });
      scene.add(g);
      track(g, 1, "item");
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
    track(plane, 3, "stain");
  }

  const dripTex = dripTexture();
  for (const d of DRIPS) {
    const mat = new THREE.MeshBasicMaterial({
      map: dripTex,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
    plane.position.set(...d.at);
    if (d.face === "x") plane.rotation.y = Math.PI / 2;
    if (d.face === "-x") plane.rotation.y = -Math.PI / 2;
    plane.position.y -= d.h / 2;
    scene.add(plane);
    track(plane, 3, "stain");
  }

  const gooMat = new THREE.MeshStandardMaterial({ color: 0x7fae4a, roughness: 0.35 });
  for (const p of PUDDLES) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.12, 16, 12), gooMat);
      blob.scale.y = 0.16;
      blob.position.set((Math.random() - 0.5) * 0.5 * p.s, 0.01, (Math.random() - 0.5) * 0.5 * p.s);
      g.add(blob);
    }
    g.position.set(...p.at);
    g.scale.setScalar(p.s);
    scene.add(g);
    track(g, 3, "item");
  }

  for (const n of NOTES) {
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: n.color, side: THREE.DoubleSide }),
    );
    note.position.set(...n.at);
    if (n.face === "x") note.rotation.y = Math.PI / 2;
    note.rotation.z = (Math.random() - 0.5) * 0.4;
    scene.add(note);
    track(note, 1, "item");
  }

  const crumbMat = new THREE.MeshStandardMaterial({ color: 0x6e4e34, roughness: 1 });
  for (const c of CRUMBS) {
    const g = new THREE.Group();
    for (let i = 0; i < c.n; i++) {
      const crumb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03 + Math.random() * 0.03), crumbMat);
      crumb.position.set((Math.random() - 0.5) * 2 * c.spread, 0.02, (Math.random() - 0.5) * 2 * c.spread);
      g.add(crumb);
    }
    g.position.set(...c.at);
    scene.add(g);
    track(g, 1, "item");
  }

  const total = cleanables.length;
  let cleaned = 0;
  cb.onProgress(0, total);

  interface Pop {
    obj: THREE.Object3D;
    t: number;
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

  function fadeStain(c: Cleanable) {
    c.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mat = o.material as THREE.Material & { opacity: number; transparent: boolean };
        mat.transparent = true;
        mat.opacity = c.hitsLeft / c.maxHits;
      }
    });
  }

  function onPointerDown(e: PointerEvent) {
    const c = pick(e);
    if (!c) return;
    c.hitsLeft -= 1;
    if (c.maxHits > 1 && c.hitsLeft > 0) fadeStain(c);
    if (c.hitsLeft <= 0) {
      cleaned += 1;
      cb.onProgress(cleaned, total);
      pops.push({ obj: c.root, t: 0 });
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
