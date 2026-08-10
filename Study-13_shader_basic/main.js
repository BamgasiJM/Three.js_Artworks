import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. 기본 씬 구성
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5); // 오빗 컨트롤 조작을 위해 카메라 위치 조정

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. 마우스 카메라 제어 (OrbitControls)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 부드러운 움직임 효과 적용

// 3. 3D 모델 파일 로더 (GLTFLoader)
const gltfLoader = new GLTFLoader();

// 4. 외부 GLSL 텍스트 파일 불러오기 함수
async function loadShader(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`셰이더 로드 실패: ${path}`);
  return await response.text();
}

// 5. 애플리케이션 초기화 구동
async function init() {
  try {
    // 병렬로 외부 셰이더 파일 수신
    const [vertexShader, fragmentShader] = await Promise.all([
      loadShader('./shaders/vert.glsl'),
      loadShader('./shaders/frag.glsl')
    ]);

    const uniforms = { uTime: { value: 0.0 } };

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms
    });

    // 예시용 기본 Torus 배치 (마우스로 돌려볼 수 있습니다)
    const geometry = new THREE.TorusGeometry(1, 0.3, 32, 100);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    /* ----------------------------------------------------
       실제 3D 모델(.gltf / .glb)을 로드하여 셰이더를 덮어씌울 때 예시:

       gltfLoader.load('./models/dinosaur.glb', (gltf) => {
           const model = gltf.scene;
           model.traverse((child) => {
               if (child.isMesh) {
                   child.material = material; // 로드한 모델에 커스텀 셰이더 적용
               }
           });
           scene.add(model);
       });
       ---------------------------------------------------- */

    // 6. 애니메이션 루프
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;

      // 마우스 드래그 컨트롤 상태 업데이트
      controls.update();

      renderer.render(scene, camera);
    }
    animate();

  } catch (error) {
    console.error("초기화 실패:", error);
  }
}

init();

// 리사이즈 이벤트
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
