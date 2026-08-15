import * as THREE from "three/webgpu"; // WebGPU 렌더러 사용
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// WebGPU 렌더러 사용
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x050525);

const numCubes = 7000;
const cubes = [];
const geometry = new THREE.BoxGeometry();
const clock = new THREE.Clock();

const velX = [];
const velY = [];
const velZ = [];

const voidRadius = 20;
const springStiffness = 1.2;
const damping = 0.5;

for (let i = 0; i < numCubes; i++) {
  const randomColor = Math.random() > 0.5 ? 0x0fc0ff : 0xffffff;
  // MeshPhongMaterial → MeshStandardNodeMaterial (WebGPU 노드 머티리얼)
  const material = new THREE.MeshStandardNodeMaterial({ color: randomColor });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.set(
    (Math.random() - 0.5) * 240,
    (Math.random() - 0.5) * 240,
    (Math.random() - 0.5) * 240,
  );
  cube.scale.set(
    0.5 + Math.random() * 0.1,
    0.1 + Math.random() * 0.1,
    0.1 + Math.random() * 0.1,
  );

  cubes.push(cube);
  scene.add(cube);

  velX.push(0);
  velY.push(0);
  velZ.push(0);
}

camera.position.z = 100;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.15;
controls.enableZoom = true;

const dirLight = new THREE.DirectionalLight(0xffffff, 1.7);
dirLight.position.set(1, 1, 1).normalize();
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// MeshBasicMaterial → MeshBasicNodeMaterial
const voidSphere = new THREE.Mesh(
  new THREE.SphereGeometry(voidRadius, 16, 16),
  new THREE.MeshBasicNodeMaterial({
    color: 0x101010,
    wireframe: true,
    transparent: true,
    opacity: 0.0,
  }),
);
scene.add(voidSphere);

let prevTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const dt = Math.min(elapsed - prevTime, 0.02);
  prevTime = elapsed;

  cubes.forEach((cube, index) => {
    const t = elapsed + index * 0.01;
    cube.rotation.x = Math.sin(t) * Math.PI * 0.5;
    cube.rotation.y = Math.cos(t) * Math.PI * 0.5;

    const dx = -cube.position.x;
    const dy = -cube.position.y;
    const dz = -cube.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 0.01) {
      const normX = dx / dist;
      const normY = dy / dist;
      const normZ = dz / dist;
      const offset = dist - voidRadius;
      const springForce = offset * springStiffness;
      velX[index] += normX * springForce * dt * 1;
      velY[index] += normY * springForce * dt * 1;
      velZ[index] += normZ * springForce * dt * 1;
    }

    velX[index] *= damping;
    velY[index] *= damping;
    velZ[index] *= damping;

    cube.position.x += velX[index];
    cube.position.y += velY[index];
    cube.position.z += velZ[index];
  });

  controls.update();
  renderer.render(scene, camera);
}

// WebGPU는 초기화가 비동기이므로 init() 필요
async function init() {
  await renderer.init();
  animate();
}

init();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    const strength = 115;
    cubes.forEach((cube, index) => {
      const x = cube.position.x;
      const y = cube.position.y;
      const z = cube.position.z;
      const dist = Math.sqrt(x * x + y * y + z * z) || 1;
      velX[index] = (x / dist) * strength;
      velY[index] = (y / dist) * strength;
      velZ[index] = (z / dist) * strength;
    });
  }
});
