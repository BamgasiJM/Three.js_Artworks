import * as THREE from "three";

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

const camera = new THREE.OrthographicCamera(
  -1,
  1,
  1,
  -1,
  0,
  1
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const uniforms = {
  u_time: {
    value: 0
  },
  u_resolution: {
    value: new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    )
  }
};

const material = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3,
  vertexShader: vertexSource,
  fragmentShader: fragmentSource,
  uniforms
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

const clock = new THREE.Clock();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  uniforms.u_resolution.value.set(width, height);
}

function animate() {
  uniforms.u_time.value = clock.getElapsedTime();

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);

animate();
