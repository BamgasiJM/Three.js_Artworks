import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 1. Scene
const scene = new THREE.Scene();
const bgColor = 0x050505 // ✅ 어두운 배경 (트레일 잘 보이게)
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 5, 2000);

// 2. Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 3);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 4. Light & Shadow
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 6, 3);
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
    model.position.set(0, -1.4, 0);
    model.rotation.set(0, 0, 0); // radian
    model.scale.set(1, 1, 1);
    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      });
    }

    loadNPYAnimation();
  },
  undefined,
  (error) => {
    console.error("GLB 로드 실패:", error);
  }
);

// ==========================================
// ✅ 7. NPY 파싱 함수
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
// ✅ 8. 설정 및 전역 변수
// ==========================================
let allFramesData = null;
let numFrames = 0;
let numVertices = 0;
let currentFrame = 0;
let landmarkPoints = null;
let lastValidCoords = null;
let previousPositions = null;

// ✅ 트레일 설정
const TRAIL_CONFIG = {
  enabled: true,
  maxTrails: 20,
  fadeRate: 0.85,
  trailObjects: [],
};

// ✅ 색상 설정
const COLOR_CONFIG = {
  enabled: true,
  minSpeed: 0.05,
  maxSpeed: 0.12,
};

const CONFIG = {
  SCALE: 5.0,
  DEPTH_SCALE: 0.12,
  VIS_THRESHOLD: 0.5,
  fps: 30,
  HEIGHT_OFFSET: 0.8,
};

// ==========================================
// ✅ 9. 원형 포인트 텍스처 생성 (정사각형 → 원)
// ==========================================
function createCircleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  // 투명한 배경
  ctx.clearRect(0, 0, 32, 32);

  // 원형 그라데이션
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ==========================================
// ✅ 10. NPY 애니메이션 로드 함수
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

      if (shape.length === 3) {
        numFrames = shape[0];
        numVertices = shape[1];
        allFramesData = positions;
        console.log(`✅ 애니메이션: ${numFrames}프레임, ${numVertices}정점`);
      } else {
        throw new Error("지원하지 않는 NPY 형식");
      }

      // ✅ 이전 프레임 좌표 초기화
      lastValidCoords = new Array(numVertices).fill(null).map(() => [0, 0, 0]);
      previousPositions = new Array(numVertices).fill(null).map(() => [0, 0, 0]);

      const centerOffset = calculateCenterOffset(0);
      console.log("중심 오프셋:", centerOffset);

      // ✅ 메인 포인트 생성
      const pointsGeometry = new THREE.BufferGeometry();
      const initialData = getFrameData(0, centerOffset);

      pointsGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initialData.positions, 3)
      );

      const colors = new Float32Array(numVertices * 3);
      // ✅ 모든 정점에 색상 초기화 (누락 방지)
      for (let i = 0; i < numVertices; i++) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }
      pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      // ✅ 원형 텍스처 적용
      const circleTexture = createCircleTexture();

      const pointsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12, // ✅ 크기 약간 증가
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        map: circleTexture, // ✅ 원형 텍스처
        alphaTest: 0.1, // ✅ 투명 픽셀 제거
        depthWrite: false, // ✅ 블렌딩 개선
        blending: THREE.AdditiveBlending, // ✅ 빛나는 효과
      });

      landmarkPoints = new THREE.Points(pointsGeometry, pointsMaterial);
      scene.add(landmarkPoints);

      if (numFrames > 1) {
        startAnimation();
      }
    })
    .catch((error) => {
      console.error("NPY 로드 실패:", error);
    });
}

// ==========================================
// ✅ 11. 중심 오프셋 계산
// ==========================================
function calculateCenterOffset(frameIndex) {
  const frameData = getRawFrameData(frameIndex);
  const validPoints = [];

  for (let i = 0; i < numVertices; i++) {
    const idx = i * 4;
    const vis = frameData[idx + 3];
    if (vis > CONFIG.VIS_THRESHOLD) {
      validPoints.push([frameData[idx], frameData[idx + 1], frameData[idx + 2]]);
    }
  }

  if (validPoints.length === 0) return [0.5, 0.5, 0.5];

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
// ✅ 12. Raw 프레임 데이터 추출
// ==========================================
function getRawFrameData(frameIndex) {
  if (numFrames <= 1) return allFramesData;
  const frameSize = numVertices * 4;
  const startOffset = frameIndex * frameSize;
  return allFramesData.slice(startOffset, startOffset + frameSize);
}

// ==========================================
// ✅ 13. 프레임 데이터 계산 (위치 + 색상)
// ==========================================
function getFrameData(frameIndex, centerOffset) {
  const frameData = getRawFrameData(frameIndex);
  const positions = new Float32Array(numVertices * 3);
  const colors = new Float32Array(numVertices * 3);

  for (let i = 0; i < numVertices; i++) {
    const idx = i * 4;
    const x = frameData[idx];
    const y = frameData[idx + 1];
    const z = frameData[idx + 2];
    const vis = frameData[idx + 3];

    const posIdx = i * 3;

    if (vis > CONFIG.VIS_THRESHOLD) {
      const nx = (x - centerOffset[0]) * CONFIG.SCALE;
      const ny = (1.0 - y - centerOffset[1]) * CONFIG.SCALE;
      const nz = (z - centerOffset[2]) * CONFIG.SCALE * CONFIG.DEPTH_SCALE;

      const finalY = ny + CONFIG.HEIGHT_OFFSET;
      lastValidCoords[i] = [nx, finalY, nz];

      positions[posIdx] = nx;
      positions[posIdx + 1] = finalY;
      positions[posIdx + 2] = nz;

      // ✅ 속도 계산 및 색상 매핑
      const velocity = calculateVelocity(i, [nx, finalY, nz]);
      const color = getVelocityColor(velocity);

      colors[posIdx] = color.r;
      colors[posIdx + 1] = color.g;
      colors[posIdx + 2] = color.b;

      previousPositions[i] = [nx, finalY, nz];
    } else {
      // ✅ 가시성 낮음: 이전 좌표 유지 (트레일 끊김 방지)
      if (lastValidCoords[i]) {
        positions[posIdx] = lastValidCoords[i][0];
        positions[posIdx + 1] = lastValidCoords[i][1];
        positions[posIdx + 2] = lastValidCoords[i][2];

        // 이전 색상 유지 (0,0,0 으로 초기화되지 않도록)
        const prevColor = getVelocityColor(0.01);
        colors[posIdx] = prevColor.r;
        colors[posIdx + 1] = prevColor.g;
        colors[posIdx + 2] = prevColor.b;
      } else {
        // 초기값 설정
        positions[posIdx] = 0;
        positions[posIdx + 1] = 0;
        positions[posIdx + 2] = 0;
        colors[posIdx] = 0.5;
        colors[posIdx + 1] = 0.5;
        colors[posIdx + 2] = 0.5;
      }
    }
  }

  return { positions, colors };
}

// ==========================================
// ✅ 14. 속도 계산
// ==========================================
function calculateVelocity(index, currentPos) {
  const prev = previousPositions[index];
  if (!prev) return 0;

  const dx = currentPos[0] - prev[0];
  const dy = currentPos[1] - prev[1];
  const dz = currentPos[2] - prev[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ==========================================
// ✅ 15. 속도에 따른 색상 반환
// ==========================================
function getVelocityColor(velocity) {
  const t = Math.min(velocity / COLOR_CONFIG.maxSpeed, 1.0);
  const hue = 240 * (1 - t);
  const color = new THREE.Color();
  color.setHSL(hue / 360, 1.0, 0.5);

  return { r: color.r, g: color.g, b: color.b };
}

// ==========================================
// ✅ 16. 트레일 생성 (수정됨)
// ==========================================
function createTrail(positions, colors) {
  if (!TRAIL_CONFIG.enabled) return;

  // 오래된 트레일 제거
  if (TRAIL_CONFIG.trailObjects.length >= TRAIL_CONFIG.maxTrails) {
    const oldTrail = TRAIL_CONFIG.trailObjects.shift();
    scene.remove(oldTrail);
    oldTrail.geometry.dispose();
    oldTrail.material.dispose();
  }

  // ✅ 새 트레일 생성 (Float32Array 복사 방법 수정)
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)  // ✅ 수정됨
  );
  trailGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)  // ✅ 수정됨
  );

  const trailMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    map: createCircleTexture(),
    alphaTest: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const trail = new THREE.Points(trailGeometry, trailMaterial);
  scene.add(trail);
  TRAIL_CONFIG.trailObjects.push(trail);
}

// ==========================================
// ✅ 17. 트레일 업데이트 (페이드 아웃)
// ==========================================
function updateTrails() {
  TRAIL_CONFIG.trailObjects.forEach((trail, index) => {
    const opacity = 0.4 * Math.pow(TRAIL_CONFIG.fadeRate, index + 1);
    trail.material.opacity = opacity;
  });
}

// ==========================================
// ✅ 18. 애니메이션 제어
// ==========================================
let isAnimating = true;
let animationTimer = 0;

function startAnimation() {
  isAnimating = true;
}

function updateAnimationFrame() {
  if (!isAnimating || numFrames <= 1 || !landmarkPoints) return;

  currentFrame = (currentFrame + 1) % numFrames;
  const centerOffset = calculateCenterOffset(0);
  const frameData = getFrameData(currentFrame, centerOffset);

  // ✅ 메인 포인트 업데이트
  landmarkPoints.geometry.attributes.position.array = frameData.positions;
  landmarkPoints.geometry.attributes.position.needsUpdate = true;
  landmarkPoints.geometry.attributes.color.array = frameData.colors;
  landmarkPoints.geometry.attributes.color.needsUpdate = true;

  // ✅ 트레일 생성 (모든 프레임마다)
  createTrail(frameData.positions, frameData.colors);
  updateTrails();
}

// ==========================================
// ✅ 19. Window Resize
// ==========================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// ✅ 20. Animate
// ==========================================
let mixer;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

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
// ✅ 21. 키보드 컨트롤
// ==========================================
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case " ":
      isAnimating = !isAnimating;
      console.log(isAnimating ? "▶ 재생" : "⏸ 일시정지");
      break;
    case "t":
      TRAIL_CONFIG.enabled = !TRAIL_CONFIG.enabled;
      console.log(`트레일: ${TRAIL_CONFIG.enabled ? "ON" : "OFF"}`);
      // 트레일 모두 제거
      if (!TRAIL_CONFIG.enabled) {
        TRAIL_CONFIG.trailObjects.forEach((trail) => {
          scene.remove(trail);
          trail.geometry.dispose();
          trail.material.dispose();
        });
        TRAIL_CONFIG.trailObjects = [];
      }
      break;
    case "c":
      COLOR_CONFIG.enabled = !COLOR_CONFIG.enabled;
      console.log(`속도색상: ${COLOR_CONFIG.enabled ? "ON" : "OFF"}`);
      break;
    case "ArrowUp":
      CONFIG.fps = Math.min(CONFIG.fps + 5, 120);
      console.log(`FPS: ${CONFIG.fps}`);
      break;
    case "ArrowDown":
      CONFIG.fps = Math.max(CONFIG.fps - 5, 1);
      console.log(`FPS: ${CONFIG.fps}`);
      break;
    case "+":
      TRAIL_CONFIG.maxTrails = Math.min(TRAIL_CONFIG.maxTrails + 5, 50);
      console.log(`트레일 개수: ${TRAIL_CONFIG.maxTrails}`);
      break;
    case "-":
      TRAIL_CONFIG.maxTrails = Math.max(TRAIL_CONFIG.maxTrails - 5, 5);
      console.log(`트레일 개수: ${TRAIL_CONFIG.maxTrails}`);
      break;
  }
});