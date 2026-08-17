import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

document.body.appendChild(renderer.domElement);

// --- Scene / Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);

// --- Mesh Object ---
const geometry = new THREE.TorusKnotGeometry(1, 0.3, 96, 32);
const material = new THREE.MeshStandardMaterial({
  color: 0x223344,
  emissive: 0xff66ff,
  emissiveIntensity: 0.6,
  metalness: 0.9,
  roughness: 0.2,
})
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Lights ---
scene.add(new THREE.AmbientLight(0x111111));

const keyLight = new THREE.PointLight(0xffffff, 10);
keyLight.position.set(3, 3, 3);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x4488ff, 6);
rimLight.position.set(-4, -2, -4);
scene.add(rimLight);

// --- Post-processing (Bloom) ---
const composer = new EffectComposer(renderer);

// 1) 씬을 렌더링하는 기본 패스
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2) Bloom 패스: resolution | strength | radious | threshold
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innderWidth, window.innerHeight), 0.8, 0.5, 0.2);
composer.addPass(bloomPass);

// 3) 색 공간/톤 맵핑 출력 패
const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Resize ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  mesh.rotation.x = time * 0.4;
  mesh.rotation.y = time * 0.1;

  composer.render();
}

animate();