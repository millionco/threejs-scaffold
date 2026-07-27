import "./style.css";
import * as THREE from "three";

const canvas = required<HTMLCanvasElement>("view");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 12, 40);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
const target = new THREE.Vector3(0, 0.4, 0);
let orbitAngle = 0.7;
const orbitRadius = 5.8;
const orbitHeight = 2.4;

scene.add(new THREE.AmbientLight(0x8aa0ff, 0.45));

const key = new THREE.DirectionalLight(0xfff2d6, 1.35);
key.position.set(4, 8, 2);
scene.add(key);

const fill = new THREE.DirectionalLight(0x6a8cff, 0.35);
fill.position.set(-5, 2, -3);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x151b2e, roughness: 0.95, metalness: 0.05 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x5b8cff, roughness: 0.55, metalness: 0.15 }),
);
mesh.position.y = 0.6;
scene.add(mesh);

const grid = new THREE.GridHelper(20, 20, 0x334066, 0x1c2438);
grid.position.y = 0.001;
scene.add(grid);

let running = true;
let last = performance.now();

function frame(now: number): void {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mesh.rotation.x += dt * 0.55;
  mesh.rotation.y += dt * 0.9;
  orbitAngle += dt * 0.25;
  camera.position.set(
    target.x + Math.cos(orbitAngle) * orbitRadius,
    orbitHeight,
    target.z + Math.sin(orbitAngle) * orbitRadius,
  );
  camera.lookAt(target);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

addEventListener("beforeunload", () => {
  running = false;
  renderer.dispose();
});

requestAnimationFrame(frame);

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}
