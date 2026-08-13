import "./style.css";
import { createRoot } from "react-dom/client";
import * as THREE from "three";

function init(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 3;

  // Add lights, meshes, and other scene objects here.

  function frame() {
    // Update scene objects and animations here.
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  requestAnimationFrame(frame);
}

function App() {
  return <canvas id="view" ref={init} />;
}

const root = document.querySelector("#root") as HTMLDivElement;
createRoot(root).render(<App />);
