import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

export function loadModel(name: string): Promise<THREE.Group> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(`/models/${name}.glb`).then((gltf) => {
      const g = gltf.scene;
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      return g;
    });
    cache.set(name, p);
  }
  return p.then((g) => g.clone(true));
}

export async function instance(
  name: string,
  opts: {
    position?: [number, number, number];
    rotationY?: number;
    /** uniform scale so the largest bbox dimension equals this */
    fitSize?: number;
    scale?: number;
  } = {},
): Promise<THREE.Group> {
  const g = await loadModel(name);
  if (opts.fitSize) {
    const box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    box.getSize(size);
    const max = Math.max(size.x, size.y, size.z);
    if (max > 0) g.scale.setScalar(opts.fitSize / max);
  } else if (opts.scale) {
    g.scale.setScalar(opts.scale);
  }
  if (opts.position) g.position.set(...opts.position);
  if (opts.rotationY !== undefined) g.rotation.y = opts.rotationY;
  return g;
}
