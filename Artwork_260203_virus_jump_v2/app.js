import * as THREE from "three";

// 1. Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4682b4);
scene.fog = new THREE.Fog(0x666666, 0.01, 30);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("three-canvas"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
const d = 5;
directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.top = d;
directionalLight.shadow.camera.bottom = -d;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// --- Objects ---

// Big Sphere Group
const bigSphereGroup = new THREE.Group();
const sphereRadius = 3.05;
const bigGeometry = new THREE.IcosahedronGeometry(sphereRadius, 3);
const bigMaterial = new THREE.MeshStandardMaterial({
  color: 0x00a86b,
  flatShading: true,
});
const bigSphere = new THREE.Mesh(bigGeometry, bigMaterial);
bigSphere.castShadow = true;
bigSphere.receiveShadow = true;
bigSphereGroup.add(bigSphere);

// [최적화 1] InstancedMesh 사용 (1000개의 Draw Call -> 1개로 압축)
const numberOfCones = 1000;
const coneGeometry = new THREE.ConeGeometry(1, 1, 12);
coneGeometry.translate(0, 0.5, 0); // 피벗을 바닥으로 이동
const coneMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.6,
});
const coneMesh = new THREE.InstancedMesh(
  coneGeometry,
  coneMaterial,
  numberOfCones,
);
coneMesh.castShadow = true;
coneMesh.receiveShadow = true;

// 충돌 감지를 위한 데이터 저장소 (CPU 연산용)
const conesData = [];
const dummy = new THREE.Object3D();
const _color = new THREE.Color();

for (let i = 0; i < numberOfCones; i++) {
  // 위치 계산
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const direction = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );

  const position = direction.clone().multiplyScalar(sphereRadius);

  // 크기 및 회전 설정
  dummy.position.copy(position);
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const r = Math.random() * 0.1 + 0.05; // 반지름 스케일
  const h = Math.random() * 0.25 + 0.1; // 높이 스케일
  dummy.scale.set(r, h, r);
  dummy.updateMatrix();

  // 인스턴스 행렬 설정
  coneMesh.setMatrixAt(i, dummy.matrix);

  // 색상 설정 (Hue 0~40)
  const hue = THREE.MathUtils.randFloat(0, 40 / 360);
  _color.setHSL(hue, 0.9, 0.5);
  coneMesh.setColorAt(i, _color);

  // [최적화 2] 충돌 감지용 데이터 저장 (로컬 좌표계 기준)
  // 매번 월드 좌표를 구할 필요 없이, 로컬 좌표로만 비교하기 위함
  conesData.push({
    position: position.clone(), // 로컬 위치
    radius: r, // 충돌 반경 근사값
  });
}

bigSphereGroup.add(coneMesh);
scene.add(bigSphereGroup);

// Small Sphere (Player)
const smallGeometry = new THREE.IcosahedronGeometry(0.06, 1);
const smallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  flatShading: true,
});
const smallSphere = new THREE.Mesh(smallGeometry, smallMaterial);
const groundY = 3.06 + 0.06; // 바닥 기준점
smallSphere.position.set(0, groundY, 0);
smallSphere.castShadow = true;
smallSphere.receiveShadow = true;
scene.add(smallSphere);

// --- Logic ---

// Camera
function updateCamera() {
  camera.position.set(0, 3.8, 1.2);
  camera.lookAt(0, 3, -0.7);
}

// Rotation
const rotationSpeed = 0.003;
function rotateWorld() {
  bigSphereGroup.rotation.x += rotationSpeed;
  bigSphereGroup.rotation.y += rotationSpeed / 2;
  bigSphereGroup.rotation.z += rotationSpeed / 3;

  // 작은 공은 반대 방향으로 회전시켜 제자리 뛰는 느낌 유지
  smallSphere.rotation.x -= rotationSpeed * 20;
  smallSphere.rotation.y -= rotationSpeed * 5;
}

// [요청] 풍선 점프 물리 (Balloon Physics)
let velocityY = 0;
const gravity = -0.002; // 중력을 약하게 (풍선 느낌)
const jumpImpulse = 0.08; // 점프 힘 (누적됨)
const friction = 0.96; // 공기 저항 (속도 감쇠)
const maxVelocity = 0.2; // 최대 속도 제한

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    // 점프 힘을 현재 속도에 더함 (공중 점프 가능)
    velocityY += jumpImpulse;
    // 속도가 너무 빠르면 제한
    if (velocityY > maxVelocity) velocityY = maxVelocity;
  }
});

function updatePhysics() {
  // 위치 업데이트
  smallSphere.position.y += velocityY;

  // 물리 적용
  if (smallSphere.position.y > groundY) {
    velocityY += gravity; // 중력 적용
    velocityY *= friction; // 공기 저항 적용 (부드러운 감속)
  } else {
    // 바닥에 닿았을 때
    smallSphere.position.y = groundY;
    // 바닥 탄성 (약간 튕기거나 멈춤) - 여기선 멈춤 처리
    if (velocityY < 0) velocityY = 0;
  }
}

// Collision Detection Optimization
const tempPlayerPos = new THREE.Vector3();
const targetScaleVec = new THREE.Vector3(1, 1, 1);
let collisionTimer = 0;

function checkCollision() {
  let hit = false;

  // 1. 플레이어의 월드 좌표를 구함
  // (작은 공은 scene의 자식이므로 position이 곧 월드 좌표와 비슷하지만 안전하게 복사)
  tempPlayerPos.copy(smallSphere.position);

  // 2. 플레이어 좌표를 'BigSphereGroup'의 로컬 좌표계로 변환 (핵심 최적화)
  // 이렇게 하면 회전하는 1000개의 가시 좌표를 매번 계산할 필요 없이,
  // 플레이어 하나만 변환해서 고정된 가시 좌표들과 비교하면 됨.
  bigSphereGroup.worldToLocal(tempPlayerPos);

  // 3. 거리 검사 (배열 순회)
  // 최적화: 플레이어는 (0, y, 0) 근처에 있으므로, y값이 너무 먼(구의 반대편) 가시들은 skip 가능하나
  // 현재는 단순 거리 계산으로도 충분히 빠름 (1000번의 단순 float 연산)
  const threshold = 0.15; // 충돌 범위

  for (let i = 0; i < numberOfCones; i++) {
    const cone = conesData[i];
    // 거리 제곱 계산이 더 빠르지만(Math.sqrt 생략), 가독성을 위해 distanceTo 사용
    const dist = tempPlayerPos.distanceTo(cone.position);

    // 가시의 스케일을 고려하여 충돌 판정
    if (dist < threshold + cone.radius * 0.5) {
      hit = true;
      break; // 하나라도 부딪히면 종료
    }
  }

  // 충돌 반응 (이전과 동일)
  if (hit) {
    smallSphere.material.color.setHex(0xff0000);
    targetScaleVec.set(0.5, 0.5, 0.5);
    collisionTimer = 10;
  } else {
    if (collisionTimer > 0) {
      collisionTimer--;
    } else {
      smallSphere.material.color.setHex(0xffffff);
      targetScaleVec.set(1, 1, 1);
    }
  }
  smallSphere.scale.lerp(targetScaleVec, 0.1);
}

function animate() {
  requestAnimationFrame(animate);

  rotateWorld();
  updatePhysics();
  checkCollision();
  updateCamera();

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
