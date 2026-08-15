import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

async function loadShader(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load shader: ${path}`);
  }

  return response.text();
}

const vertexSource = await loadShader("/shaders/vert_lighting.glsl");
const fragmentSource = await loadShader("/shaders/frag_lighting.glsl");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141414);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 12);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const arrowHelper = new THREE.ArrowHelper(
  new THREE.Vector3(2, 1, 1).normalize(),
  new THREE.Vector3(0, 0, 0),
  5,
  0xffff00
);
scene.add(arrowHelper);

const lightPosition = new THREE.Vector3(4, 1, 3);

const uniforms = {
  u_time: { value: 0 },
  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  u_lightDir: { value: lightPosition.clone() },
  u_lightColor: { value: new THREE.Color(0xf0a3e2) },
  u_ambient: { value: new THREE.Color(0xd0ddff).multiplyScalar(0.4) },
  u_shininess: { value: 7.0 },
  u_specStrength: { value: 1.2 }
};

const material = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3,
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
  uniforms
});

const geometry = new THREE.TorusGeometry(2, 0.8, 64, 128);
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

const clock = new THREE.Clock();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  uniforms.u_resolution.value.set(width, height);
}

function animate() {
  uniforms.u_time.value = clock.getElapsedTime();
  const lightDirNormalized = lightPosition.clone().normalize();
  uniforms.u_lightDir.value = lightDirNormalized;
  arrowHelper.setDirection(lightDirNormalized);
  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
animate();
