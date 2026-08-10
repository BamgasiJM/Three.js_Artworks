import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 1. Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151515);

// 2. Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 1.5, 3);

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 4. Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 5. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ✅ 애니메이션을 위한 변수들
let mixer;
const clock = new THREE.Clock();

// 6. GLB Loader
const loader = new GLTFLoader();
loader.load(
  "./assets/InterpolationTest.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // ✅ 애니메이션이 있으면 설정
    if (gltf.animations && gltf.animations.length > 0) {
      console.log(
        "로드된 애니메이션:",
        gltf.animations.map((anim) => anim.name),
      );

      // AnimationMixer 생성
      mixer = new THREE.AnimationMixer(model);

      // 모든 애니메이션을 반복 재생 (여러 개인 경우 모두 재생)
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat); // 반복 설정
        action.play();
      });
    }
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

// 7. Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Animate
function animate() {
  requestAnimationFrame(animate);
  
  // ✅ 애니메이션 업데이트 (delta time으로 부드럽게)
  if (mixer) {
    mixer.update(clock.getDelta());
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