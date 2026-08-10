import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 1. Scene
const scene = new THREE.Scene();
const bgColor = 0x151515;
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 5, 20);

// 2. Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;

directionalLight.shadow.mapSize.width = 4096; // 그림자 품질
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5; // 그림자 범위
directionalLight.shadow.camera.far = 50;

// 그림자가 잘리지 않도록 조명 내부의 그림자 카메라 투영 범위 확장
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

// 그림자 줄무늬(Acne) 방지
directionalLight.shadow.bias = -0.0005;

scene.add(directionalLight);

// 5. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2; // 바닥 아래로 카메라가 내려가지 않도록 제한

// 6. GLB Loader
const loader = new GLTFLoader();
loader.load(
  "./assets/monkey.glb",
  (gltf) => {
    const model = gltf.scene;

    // ✅ 모델의 모든 메쉬에 그림자 설정 적용
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true; // 그림자 생성
        node.receiveShadow = true; // 그림자 받기 (셀프 쉐도우)
      }
    });

    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      });
    }
  },
  undefined,
  (error) => {
    console.error("GLB 로드 실패:", error);
  },
);

// 7. Window Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Animate
let mixer; // 애니메이션 변수
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// GLB 파일의 애니메이션이 무한 반복되면서 재생
// GLB에 여러 애니메이션이 포함된 경우 모두 동시에 재생
// Clock 추가: getDelta()로 프레임 간 시간 차이를 계산하여 애니메이션 속도를 일정하게 유지
// AnimationMixer: GLB의 애니메이션 데이터를 관리하고 재생하는 컨트롤러
// setLoop(THREE.LoopRepeat): 애니메이션이 끝나도 계속 반복하도록 설정
// mixer.update(): 렌더 루프에서 매 프레임마다 애니메이션 상태를 갱신 (필수)