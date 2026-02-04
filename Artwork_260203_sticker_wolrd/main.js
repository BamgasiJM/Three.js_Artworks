import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 기본 세팅
const container = document.getElementById("webgl-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc06070);
scene.fog = new THREE.Fog(0xc06070, 0.1, 20.0); 
// scene.add(new THREE.AxesHelper(5));

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 조명
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));


// 이미지 파일 리스트 (stickers 폴더 안에 있는 png 파일들)
const imageFiles = [
  "stickers/sticker_bee.png",
  "stickers/sticker_lara_001.png",
  "stickers/sticker_lara_002.png",
  "stickers/sticker_lara_003.png",
  "stickers/sticker_lara_004.png",
  "stickers/sticker_lara_005.png",
  "stickers/sticker_lara_006.png",
  "stickers/sticker_lara_007.png",
  "stickers/sticker_lara_008.png",
  "stickers/sticker_lara_009.png",
  "stickers/sticker_lara_010.png",
  "stickers/sticker_lara_011.png",
  "stickers/sticker_lara_012.png",
  "stickers/sticker_lara_013.png",
  "stickers/sticker_lara_014.png",
  "stickers/sticker_lara_015.png",
  "stickers/sticker_lara_016.png",
  "stickers/sticker_lara_017.png",
  "stickers/sticker_lara_018.png",
  "stickers/sticker_lara_019.png",
  "stickers/sticker_lara_020.png",
  "stickers/sticker_lara_021.png",
  "stickers/sticker_lara_022.png",
  "stickers/sticker_lara_023.png",
  "stickers/sticker_lara_024.png",
  "stickers/sticker_lara_025.png",
  "stickers/sticker_lara_026.png",
  "stickers/sticker_lara_027.png",
  "stickers/sticker_lara_028.png",
  "stickers/sticker_lara_029.png",
];

// 스티커들을 담을 배열
const stickers = [];

// 텍스처 로더
const loader = new THREE.TextureLoader();

// 스티커 생성 함수
function createSticker(path) {
  loader.load(path, (texture) => {
    const w = texture.image.width;
    const h = texture.image.height;
    const aspect = w / h;

    // 원하는 기본 크기 (예: 높이를 2로 맞추고 비율에 따라 너비 조정)
    const baseHeight = 1;
    const baseWidth = baseHeight * aspect;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });

    const geometry = new THREE.PlaneGeometry(baseWidth, baseHeight);
    const sticker = new THREE.Mesh(geometry, material);

    sticker.position.set(
      THREE.MathUtils.randFloatSpread(6),
      THREE.MathUtils.randFloatSpread(6),
      THREE.MathUtils.randFloatSpread(6),
    );
    // 랜덤 회전 속도 저장 (0.001 ~ 0.005)
    sticker.userData.rotationSpeed = THREE.MathUtils.randFloatSpread(0.005);

    scene.add(sticker);
    stickers.push(sticker);
  });
}

// 이미지 파일들을 스티커로 생성
imageFiles.forEach((file) => createSticker(file));

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);

  stickers.forEach((sticker) => {
    sticker.rotation.y += sticker.userData.rotationSpeed;
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();

// 반응형 리사이즈
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
