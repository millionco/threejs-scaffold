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

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.set(3.2, 2.2, 4.2);
camera.lookAt(0, 0.5, 0);

scene.add(new THREE.AmbientLight(0x8aa0ff, 0.55));
const key = new THREE.DirectionalLight(0xfff2d6, 1.2);
key.position.set(4, 8, 2);
scene.add(key);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x5b8cff, roughness: 0.55, metalness: 0.15 }),
);
mesh.name = "DemoCube";
mesh.position.y = 0.5;
scene.add(mesh);

let running = true;
let last = performance.now();

function frame(now: number): void {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mesh.rotation.x += dt * 0.55;
  mesh.rotation.y += dt * 0.9;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") mesh.position.x += 0.5;
});

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
