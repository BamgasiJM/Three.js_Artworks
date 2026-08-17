import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ================= 1. 스터디용 설정 변수 =================
const CONFIG = {
  MODEL_URL: "./assets/CHARACTER_kiditech_red.glb",

  MODEL_SCALE: 0.2, // 모델 크기 (배치할 GLB 인스턴스의 스케일)
  MODEL_COUNT: 500, // 모델 개수

  WHITE_SPHERE_COUNT: 200, // 함께 섞어 배치할 하얀 구 개수
  WHITE_SPHERE_SIZE: 0.2, // 하얀 구 반지름 (모든 하얀 구는 동일한 크기)

  SPHERE_RADIUS: 10, // 오브젝트들을 배치할 커다란 구의 반지름
  SHOW_GUIDE_SPHERE: true, // 배치 기준이 되는 큰 구를 눈으로 볼 수 있게 표시할지 여부

  ROTATION_SPEED: { x: 0.25, y: 0.4, z: 0.15 }, // GLB 모델의 로컬 xyz축 회전 속도 (rad/sec)

  DAMPING_FACTOR: 0.08, // OrbitControls damping 계수 (작을수록 더 부드럽게 감속)
};

// ================= 2. Scene / Camera / Renderer =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 6, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ================= 3. Light =================
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5.0);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// ================= 4. Controls (부드러운 댐핑) =================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = CONFIG.DAMPING_FACTOR; // 값이 작을수록 더 부드럽게 감속됨

// ================= 5. 배치 기준이 되는 커다란 구 =================
if (CONFIG.SHOW_GUIDE_SPHERE) {
  const guideSphere = new THREE.Mesh(
    new THREE.SphereGeometry(CONFIG.SPHERE_RADIUS, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff44aa,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    }),
  );
  scene.add(guideSphere);
}

// 구 표면 위의 무작위 좌표 + 바깥쪽 방향(법선) 계산
function randomPointOnSphere(radius) {
  // 균일 분포를 위한 구면 좌표 샘플링
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);

  const normal = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  );

  const position = normal.clone().multiplyScalar(radius);
  return { position, normal };
}

// ================= 6. 하얀색 작은 구 InstancedMesh =================
const whiteSphereGeometry = new THREE.SphereGeometry(
  CONFIG.WHITE_SPHERE_SIZE,
  12,
  12,
);
const whiteSphereMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
});
const whiteSphereMesh = new THREE.InstancedMesh(
  whiteSphereGeometry,
  whiteSphereMaterial,
  CONFIG.WHITE_SPHERE_COUNT,
);
scene.add(whiteSphereMesh);

{
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < CONFIG.WHITE_SPHERE_COUNT; i++) {
    const { position } = randomPointOnSphere(CONFIG.SPHERE_RADIUS);
    matrix.setPosition(position);
    whiteSphereMesh.setMatrixAt(i, matrix);
  }
  whiteSphereMesh.instanceMatrix.needsUpdate = true;
}

// ================= 7. GLB 모델 InstancedMesh =================
let modelInstancedMesh = null;
const modelInstanceData = []; // { position, baseQuaternion, phase } per instance

const UP_AXIS = new THREE.Vector3(0, 1, 0);

const loader = new GLTFLoader();
loader.load(
  CONFIG.MODEL_URL,
  (gltf) => {
    gltf.scene.updateMatrixWorld(true);

    // GLB 안의 모든 Mesh를 수집 (재질이 여러 개면 프리미티브별로 Mesh가 나뉘어 있음)
    const meshes = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });

    if (meshes.length === 0) {
      console.error("GLB 안에서 Mesh를 찾지 못했습니다.");
      return;
    }

    // 각 Mesh의 geometry에 부모 계층의 변환을 반영한 뒤, 하나의 geometry로 병합
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      return geometry;
    });
    const baseMaterials = meshes.map((mesh) => mesh.material);

    // useGroups=true 로 병합해 재질별 그룹 정보를 유지 (multi-material 지원)
    const baseGeometry = mergeGeometries(geometries, true);

    modelInstancedMesh = new THREE.InstancedMesh(
      baseGeometry,
      baseMaterials.length > 1 ? baseMaterials : baseMaterials[0],
      CONFIG.MODEL_COUNT,
    );
    scene.add(modelInstancedMesh);

    for (let i = 0; i < CONFIG.MODEL_COUNT; i++) {
      const { position, normal } = randomPointOnSphere(CONFIG.SPHERE_RADIUS);
      const baseQuaternion = new THREE.Quaternion().setFromUnitVectors(
        UP_AXIS,
        normal,
      ); // 모델이 구 바깥쪽을 향하도록 정렬

      modelInstanceData.push({
        position,
        baseQuaternion,
        phase: {
          x: Math.random() * Math.PI * 2,
          y: Math.random() * Math.PI * 2,
          z: Math.random() * Math.PI * 2,
        },
      });
    }

    updateModelInstances(0);
  },
  (progress) => {
    console.log(
      `로딩중: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`,
    );
  },
  (error) => {
    console.error("GLB 로드 실패:", error);
  },
);

// 매 프레임 각 인스턴스를 로컬 xyz축으로 회전시키면서 행렬을 갱신
const _localEuler = new THREE.Euler();
const _localQuat = new THREE.Quaternion();
const _finalQuat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

function updateModelInstances(elapsed) {
  if (!modelInstancedMesh) return;

  _scaleVec.setScalar(CONFIG.MODEL_SCALE);

  for (let i = 0; i < modelInstanceData.length; i++) {
    const data = modelInstanceData[i];

    _localEuler.set(
      elapsed * CONFIG.ROTATION_SPEED.x + data.phase.x,
      elapsed * CONFIG.ROTATION_SPEED.y + data.phase.y,
      elapsed * CONFIG.ROTATION_SPEED.z + data.phase.z,
    );
    _localQuat.setFromEuler(_localEuler);

    // 로컬 자전(_localQuat) 후 구 바깥 방향으로 정렬(baseQuaternion)
    _finalQuat.copy(data.baseQuaternion).multiply(_localQuat);

    _matrix.compose(data.position, _finalQuat, _scaleVec);
    modelInstancedMesh.setMatrixAt(i, _matrix);
  }

  modelInstancedMesh.instanceMatrix.needsUpdate = true;
}

// ================= 8. Window Resize =================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= 9. Animate =================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  updateModelInstances(elapsed);

  controls.update();
  renderer.render(scene, camera);
}
animate();
