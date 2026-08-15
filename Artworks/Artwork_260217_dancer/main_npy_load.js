import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 1. Scene
const scene = new THREE.Scene();
const bgColor = 0x45c5a5;
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 5, 20);

// 2. Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 4. Light & Shadow
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(0, 10, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

// 5. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2;

// 6. GLB Loader
const loader = new GLTFLoader();
loader.load(
  "./assets/floor.glb",
  (gltf) => {
    const model = gltf.scene;
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    model.position.set(0, -1.1, 0);  // x, y, z
    model.rotation.set(0, 0, 0);  // x, y, z (라디안)
    model.scale.set(1, 1, 1);     // x, y, z
    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      });
    }

    // ✅ 모델 로드 후 NPY 애니메이션 로드
    loadNPYAnimation();
  },
  undefined,
  (error) => {
    console.error("GLB 로드 실패:", error);
  }
);

// ==========================================
// ✅ 7. NPY 직접 파싱 함수 (4 차원 데이터 지원)
// ==========================================
function parseNPY(buffer) {
  const dataView = new DataView(buffer);

  const magic = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3),
    dataView.getUint8(4),
    dataView.getUint8(5)
  );

  if (magic !== "\x93NUMPY") {
    throw new Error("Invalid NPY file");
  }

  const majorVersion = dataView.getUint8(6);
  const minorVersion = dataView.getUint8(7);

  let headerLen;
  if (majorVersion === 1) {
    headerLen = dataView.getUint16(8, true);
  } else {
    headerLen = dataView.getUint32(8, true);
  }

  const headerOffset = majorVersion === 1 ? 10 : 12;
  const headerText = new TextDecoder().decode(
    new Uint8Array(buffer, headerOffset, headerLen)
  );

  const shapeMatch = headerText.match(/'shape':\s*\(([^)]+)\)/);
  let shape = [];
  if (shapeMatch) {
    shape = shapeMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((s) => parseInt(s));
  }

  const dataOffset = headerOffset + headerLen;
  const dataBuffer = buffer.slice(dataOffset);

  return {
    data: new Float32Array(dataBuffer),
    shape: shape,
    dtype: "float32",
  };
}

// ==========================================
// ✅ 8. NPY 애니메이션 설정 (블렌더와 동일)
// ==========================================
let allFramesData = null;
let numFrames = 0;
let numVertices = 0;
let currentFrame = 0;
let landmarkPoints = null;
let lastValidCoords = null; // 튀는 현상 방지용

// ✅ 블렌더 스크립트와 동일한 설정
const CONFIG = {
  SCALE: 5.0,
  DEPTH_SCALE: 0.12,
  VIS_THRESHOLD: 0.5,
  fps: 30,
};

// ==========================================
// ✅ 9. NPY 애니메이션 로드 함수
// ==========================================
function loadNPYAnimation() {
  fetch("./assets/dancer.npy")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buffer) => {
      const npyData = parseNPY(buffer);
      const positions = npyData.data;
      const shape = npyData.shape;

      console.log("NPY Shape:", shape);
      console.log("총 데이터 개수:", positions.length);

      // ✅ Shape 해석 (블렌더와 동일)
      if (shape.length === 3) {
        // [프레임수, 정점수, 4] - x,y,z,vis
        numFrames = shape[0];
        numVertices = shape[1];
        allFramesData = positions;
        console.log(`✅ 애니메이션: ${numFrames}프레임, ${numVertices}정점, 4 차원 (x,y,z,vis)`);
      } else if (shape.length === 2 && shape[1] === 4) {
        // [정점수, 4] - 단일 프레임
        numFrames = 1;
        numVertices = shape[0];
        allFramesData = positions;
        console.log(`✅ 단일 프레임: ${numVertices}정점`);
      } else if (shape.length === 2 && shape[1] === 3) {
        // [정점수, 3] - vis 없음
        numFrames = 1;
        numVertices = shape[0];
        allFramesData = positions;
        console.log(`✅ 3 차원 데이터 (vis 없음)`);
      } else {
        throw new Error("지원하지 않는 NPY 형식");
      }

      // ✅ 이전 프레임 좌표 초기화 (튀는 현상 방지)
      lastValidCoords = new Array(numVertices).fill(null).map(() => [0, 0, 0]);

      // ✅ 첫 프레임에서 중심 오프셋 계산 (블렌더와 동일)
      const centerOffset = calculateCenterOffset(0);
      console.log("중심 오프셋:", centerOffset);

      // ✅ Points 초기화
      const pointsGeometry = new THREE.BufferGeometry();
      const initialPositions = getFramePositions(0, centerOffset);
      pointsGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initialPositions, 3)
      );

      const pointsMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.08,
        sizeAttenuation: true,
      });

      landmarkPoints = new THREE.Points(pointsGeometry, pointsMaterial);
      landmarkPoints.position.y = 1.0;  // 위로 1.0 만큼 이동
      scene.add(landmarkPoints);

      // ✅ 애니메이션 시작
      if (numFrames > 1) {
        startAnimation();
      }
    })
    .catch((error) => {
      console.error("NPY 로드 실패:", error);
    });
}

// ==========================================
// ✅ 10. 중심 오프셋 계산 (첫 프레임 기반)
// ==========================================
function calculateCenterOffset(frameIndex) {
  const frameData = getRawFrameData(frameIndex);
  const validPoints = [];

  for (let i = 0; i < numVertices; i++) {
    const idx = i * 4;
    const x = frameData[idx];
    const y = frameData[idx + 1];
    const z = frameData[idx + 2];
    const vis = frameData[idx + 3];

    if (vis > CONFIG.VIS_THRESHOLD) {
      validPoints.push([x, y, z]);
    }
  }

  if (validPoints.length === 0) {
    return [0.5, 0.5, 0.5];
  }

  const sum = validPoints.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0]
  );

  return [
    sum[0] / validPoints.length,
    sum[1] / validPoints.length,
    sum[2] / validPoints.length,
  ];
}

// ==========================================
// ✅ 11. raw 프레임 데이터 추출
// ==========================================
function getRawFrameData(frameIndex) {
  if (numFrames <= 1) {
    return allFramesData;
  }
  const frameSize = numVertices * 4; // x,y,z,vis
  const startOffset = frameIndex * frameSize;
  return allFramesData.slice(startOffset, startOffset + frameSize);
}

// ==========================================
// ✅ 12. 프레임 위치 계산 (좌표 변환 + 필터링)
// ==========================================
function getFramePositions(frameIndex, centerOffset) {
  const frameData = getRawFrameData(frameIndex);
  const positions = new Float32Array(numVertices * 3);

  for (let i = 0; i < numVertices; i++) {
    const idx = i * 4;
    const x = frameData[idx];
    const y = frameData[idx + 1];
    const z = frameData[idx + 2];
    const vis = frameData[idx + 3];

    const posIdx = i * 3;

    // ✅ Visibility 필터링
    if (vis > CONFIG.VIS_THRESHOLD) {
      // ✅ MediaPipe → Three.js 좌표계 변환 (수정됨)
      // MediaPipe: Y=위 (0), Z=깊이
      // Three.js: Y=위 (+), Z=깊이 (+)
      const nx = (x - centerOffset[0]) * CONFIG.SCALE;
      const ny = (1.0 - y - centerOffset[1]) * CONFIG.SCALE;  // Y 반전
      const nz = (z - centerOffset[2]) * CONFIG.SCALE * CONFIG.DEPTH_SCALE;  // Z 는 깊이

      // ✅ 유효 좌표 백업 (튀는 현상 방지)
      lastValidCoords[i] = [nx, ny, nz];

      positions[posIdx] = nx;
      positions[posIdx + 1] = ny;
      positions[posIdx + 2] = nz;
    } else {
      // ✅ 가시성 낮음: 이전 프레임 좌표 사용
      if (lastValidCoords[i]) {
        positions[posIdx] = lastValidCoords[i][0];
        positions[posIdx + 1] = lastValidCoords[i][1];
        positions[posIdx + 2] = lastValidCoords[i][2];
      } else {
        positions[posIdx] = 0;
        positions[posIdx + 1] = 0;
        positions[posIdx + 2] = 0;
      }
    }
  }

  return positions;
}

// ==========================================
// ✅ 13. 애니메이션 제어
// ==========================================
let isAnimating = true;
let animationTimer = 0;

function startAnimation() {
  isAnimating = true;
}

function stopAnimation() {
  isAnimating = false;
}

function updateAnimationFrame() {
  if (!isAnimating || numFrames <= 1 || !landmarkPoints) return;

  currentFrame = (currentFrame + 1) % numFrames;

  const centerOffset = calculateCenterOffset(0); // 첫 프레임 오프셋 고정
  const framePositions = getFramePositions(currentFrame, centerOffset);

  landmarkPoints.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(framePositions, 3)
  );
  landmarkPoints.geometry.attributes.position.needsUpdate = true;
}

// ==========================================
// ✅ 14. Window Resize
// ==========================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// ✅ 15. Animate
// ==========================================
let mixer;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  // ✅ NPY 애니메이션 업데이트
  if (isAnimating && numFrames > 1 && landmarkPoints) {
    const frameInterval = 1 / CONFIG.fps;
    animationTimer += delta;

    if (animationTimer >= frameInterval) {
      updateAnimationFrame();
      animationTimer = 0;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ==========================================
// ✅ 16. 키보드 컨트롤
// ==========================================
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case " ":
      isAnimating = !isAnimating;
      console.log(isAnimating ? "▶ 재생" : "⏸ 일시정지");
      break;
    case "ArrowRight":
      if (numFrames > 1) {
        currentFrame = (currentFrame + 1) % numFrames;
        const centerOffset = calculateCenterOffset(0);
        const framePositions = getFramePositions(currentFrame, centerOffset);
        landmarkPoints.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(framePositions, 3)
        );
        landmarkPoints.geometry.attributes.position.needsUpdate = true;
        console.log(`프레임: ${currentFrame}/${numFrames}`);
      }
      break;
    case "ArrowLeft":
      if (numFrames > 1) {
        currentFrame = (currentFrame - 1 + numFrames) % numFrames;
        const centerOffset = calculateCenterOffset(0);
        const framePositions = getFramePositions(currentFrame, centerOffset);
        landmarkPoints.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(framePositions, 3)
        );
        landmarkPoints.geometry.attributes.position.needsUpdate = true;
        console.log(`프레임: ${currentFrame}/${numFrames}`);
      }
      break;
    case "ArrowUp":
      CONFIG.fps = Math.min(CONFIG.fps + 5, 120);
      console.log(`FPS: ${CONFIG.fps}`);
      break;
    case "ArrowDown":
      CONFIG.fps = Math.max(CONFIG.fps - 5, 1);
      console.log(`FPS: ${CONFIG.fps}`);
      break;
  }
});