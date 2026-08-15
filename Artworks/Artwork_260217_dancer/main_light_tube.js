// ============================================================
// IMPORT
// ============================================================
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";


// ============================================================
// 전역 설정값
// ============================================================
const CONFIG = {
  SCALE: 5.0,          // 좌표계 스케일
  DEPTH_SCALE: 0.12,   // Z축 깊이 스케일 (MediaPipe 깊이값 약화)
  VIS_THRESHOLD: 0.5,  // 랜드마크 가시성 최소 임계값
  FPS: 30,             // 애니메이션 재생 FPS
  TRAIL_LENGTH: 50,    // 트레일 길이 (프레임 수)
};


// ============================================================
// 1. SCENE
// ============================================================
const scene = new THREE.Scene();
const bgColor = 0x020d10;
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 5, 20);


// ============================================================
// 2. CAMERA
// ============================================================
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);


// ============================================================
// 3. RENDERER
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);


// ============================================================
// 4. POST-PROCESSING (Bloom 글로우 효과)
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0,  // strength  : bloom 강도
  0.2,  // radius    : bloom 번짐 반경
  0.0   // threshold : 이 밝기 이상만 bloom 적용
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());


// ============================================================
// 5. LIGHT
// ============================================================
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


// ============================================================
// 6. ORBIT CONTROLS
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2;


// ============================================================
// 7. GLB 모델 로드
// ============================================================
let mixer; // GLB 애니메이션 믹서

const loader = new GLTFLoader();
loader.load(
  "./assets/floor.glb",
  (gltf) => {
    const model = gltf.scene;

    // 위치 / 회전 / 스케일 조정
    model.position.set(0, -1.2, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    // 그림자 적용
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(model);

    // GLB 내장 애니메이션 재생
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      });
    }

    // GLB 로드 완료 후 NPY 데이터 로드
    loadNPYAnimation();
  },
  undefined,
  (error) => {
    console.error("GLB 로드 실패:", error);
  }
);


// ============================================================
// 8. NPY 파서 (NumPy .npy 바이너리 → JS Float32Array)
// ============================================================
function parseNPY(buffer) {
  const dataView = new DataView(buffer);

  // 매직 넘버 검증: \x93NUMPY
  const magic = String.fromCharCode(
    dataView.getUint8(0), dataView.getUint8(1),
    dataView.getUint8(2), dataView.getUint8(3),
    dataView.getUint8(4), dataView.getUint8(5)
  );
  if (magic !== "\x93NUMPY") {
    throw new Error("Invalid NPY file");
  }

  // 버전별 헤더 길이 파싱
  const majorVersion = dataView.getUint8(6);
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

  // shape 추출
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
  return {
    data: new Float32Array(buffer.slice(dataOffset)),
    shape,
  };
}


// ============================================================
// 9. NPY 애니메이션 상태 변수
// ============================================================
let allFramesData = null;
let numFrames = 0;
let numVertices = 0;
let currentFrame = 0;
let lastValidCoords = null; // 가시성 낮은 프레임의 좌표 보간용

let trailLines = [];        // 랜드마크별 Line 오브젝트 배열
let trailHistory = [];      // 랜드마크별 위치 히스토리 (circular buffer 역할)


// ============================================================
// 10. NPY 애니메이션 로드 및 Trail Lines 초기화
// ============================================================
function loadNPYAnimation() {
  fetch("./assets/dancer.npy")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buffer) => {
      const npyData = parseNPY(buffer);
      const shape = npyData.shape;
      allFramesData = npyData.data;

      console.log("NPY Shape:", shape);

      // shape에 따라 프레임 수 / 정점 수 결정
      if (shape.length === 3) {
        // [frames, vertices, 4] — x, y, z, visibility
        numFrames = shape[0];
        numVertices = shape[1];
        console.log(`✅ ${numFrames}프레임, ${numVertices}정점 (4D)`);
      } else if (shape.length === 2 && shape[1] === 4) {
        // [vertices, 4] — 단일 프레임
        numFrames = 1;
        numVertices = shape[0];
        console.log(`✅ 단일 프레임, ${numVertices}정점`);
      } else if (shape.length === 2 && shape[1] === 3) {
        // [vertices, 3] — visibility 없음
        numFrames = 1;
        numVertices = shape[0];
        console.log(`✅ 단일 프레임, ${numVertices}정점 (3D, vis 없음)`);
      } else {
        throw new Error("지원하지 않는 NPY shape");
      }

      // 이전 유효 좌표 초기화
      lastValidCoords = Array.from({ length: numVertices }, () => [0, 0, 0]);

      // 트레일 히스토리 초기화 (모든 히스토리 포인트를 원점으로)
      trailHistory = Array.from({ length: numVertices }, () =>
        Array.from({ length: CONFIG.TRAIL_LENGTH }, () => new THREE.Vector3(0, 1.0, 0))
      );

      // 랜드마크별 Line 오브젝트 생성
      for (let i = 0; i < numVertices; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(CONFIG.TRAIL_LENGTH * 3);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        // 랜드마크 인덱스 기반 무지개 색상
        const color = new THREE.Color().setHSL(i / numVertices, 1.0, 0.75);
        const material = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending, // 겹치는 부분 더 밝게 → 네온 효과
          depthWrite: false,
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);
        trailLines.push(line);
      }

      // 멀티프레임인 경우 애니메이션 시작
      if (numFrames > 1) {
        isAnimating = true;
      }
    })
    .catch((error) => {
      console.error("NPY 로드 실패:", error);
    });
}


// ============================================================
// 11. NPY 데이터 유틸 함수
// ============================================================

// 특정 프레임의 raw 데이터 슬라이스 반환
function getRawFrameData(frameIndex) {
  if (numFrames <= 1) return allFramesData;
  const frameSize = numVertices * 4;
  const start = frameIndex * frameSize;
  return allFramesData.slice(start, start + frameSize);
}

// 첫 프레임 기준 중심 오프셋 계산 (카메라 중앙 배치용)
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

// 특정 프레임의 Three.js 좌표계 변환된 Float32Array 반환
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

    if (vis > CONFIG.VIS_THRESHOLD) {
      // MediaPipe → Three.js 좌표 변환
      // MediaPipe: Y=아래, Three.js: Y=위 → Y 반전
      const nx = (x - centerOffset[0]) * CONFIG.SCALE;
      const ny = (1.0 - y - centerOffset[1]) * CONFIG.SCALE;
      const nz = (z - centerOffset[2]) * CONFIG.SCALE * CONFIG.DEPTH_SCALE;

      lastValidCoords[i] = [nx, ny, nz];
      positions[posIdx] = nx;
      positions[posIdx + 1] = ny;
      positions[posIdx + 2] = nz;
    } else {
      // 가시성 낮으면 이전 유효 좌표로 대체 (튀는 현상 방지)
      positions[posIdx] = lastValidCoords[i][0];
      positions[posIdx + 1] = lastValidCoords[i][1];
      positions[posIdx + 2] = lastValidCoords[i][2];
    }
  }

  return positions;
}


// ============================================================
// 12. 애니메이션 프레임 업데이트 (Trail Lines 갱신)
// ============================================================
let isAnimating = false;
let animationTimer = 0;

// 고정 중심 오프셋 캐시 (매 프레임 재계산 방지)
let cachedCenterOffset = null;

function updateAnimationFrame() {
  if (!isAnimating || numFrames <= 1 || trailLines.length === 0) return;

  currentFrame = (currentFrame + 1) % numFrames;

  if (!cachedCenterOffset) {
    cachedCenterOffset = calculateCenterOffset(0);
  }

  const framePositions = getFramePositions(currentFrame, cachedCenterOffset);

  for (let i = 0; i < numVertices; i++) {
    const px = framePositions[i * 3];
    const py = framePositions[i * 3 + 1] + 1.0; // Y 오프셋 (지면 위)
    const pz = framePositions[i * 3 + 2];

    // 히스토리 앞에 현재 위치 삽입, 가장 오래된 항목 제거
    trailHistory[i].unshift(new THREE.Vector3(px, py, pz));
    trailHistory[i].pop();

    // Line geometry 버퍼 업데이트
    const posAttr = trailLines[i].geometry.attributes.position;
    for (let t = 0; t < CONFIG.TRAIL_LENGTH; t++) {
      posAttr.setXYZ(t, trailHistory[i][t].x, trailHistory[i][t].y, trailHistory[i][t].z);
    }
    posAttr.needsUpdate = true;
    trailLines[i].geometry.setDrawRange(0, CONFIG.TRAIL_LENGTH);
  }
}


// ============================================================
// 13. 메인 렌더 루프
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // GLB 내장 애니메이션 업데이트
  if (mixer) {
    mixer.update(delta);
  }

  // NPY 트레일 애니메이션 업데이트 (FPS 제한)
  if (isAnimating && numFrames > 1 && trailLines.length > 0) {
    animationTimer += delta;
    if (animationTimer >= 1 / CONFIG.FPS) {
      updateAnimationFrame();
      animationTimer = 0;
    }
  }

  controls.update();
  composer.render(); // renderer.render() 대신 composer 사용 (bloom 적용)
}
animate();


// ============================================================
// 14. 윈도우 리사이즈 대응
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});


// ============================================================
// 15. 키보드 단축키
// ============================================================
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    // 스페이스: 재생 / 일시정지
    case " ":
      isAnimating = !isAnimating;
      console.log(isAnimating ? "▶ 재생" : "⏸ 일시정지");
      break;

    // 오른쪽 화살표: 다음 프레임
    case "ArrowRight":
      if (numFrames > 1 && trailLines.length > 0) {
        currentFrame = (currentFrame + 1) % numFrames;
        updateAnimationFrame();
        console.log(`프레임: ${currentFrame} / ${numFrames}`);
      }
      break;

    // 왼쪽 화살표: 이전 프레임
    case "ArrowLeft":
      if (numFrames > 1 && trailLines.length > 0) {
        currentFrame = (currentFrame - 1 + numFrames) % numFrames;
        updateAnimationFrame();
        console.log(`프레임: ${currentFrame} / ${numFrames}`);
      }
      break;

    // 위쪽 화살표: FPS 증가
    case "ArrowUp":
      CONFIG.FPS = Math.min(CONFIG.FPS + 5, 120);
      console.log(`FPS: ${CONFIG.FPS}`);
      break;

    // 아래쪽 화살표: FPS 감소
    case "ArrowDown":
      CONFIG.FPS = Math.max(CONFIG.FPS - 5, 1);
      console.log(`FPS: ${CONFIG.FPS}`);
      break;
  }
});