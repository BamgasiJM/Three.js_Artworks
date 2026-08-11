import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

async function loadShader(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load shader: ${path}`);
  }

  return response.text();
}

const vertexSource = await loadShader("/shaders/vert.glsl");
const fragmentSource = await loadShader("/shaders/frag.glsl");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const uniforms = {
  u_time: { value: 0 },
  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const material = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3,
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
  uniforms
});

const geometry = new THREE.PlaneGeometry(2, 2, 64, 64);
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

const clock = new THREE.Clock();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  uniforms.u_resolution.value.set(width, height);
}

function animate() {
  uniforms.u_time.value = clock.getElapsedTime();
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
animate();
