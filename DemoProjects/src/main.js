import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// WebGL 그림자 지원 확인
const gl = document.getElementById('canvas').getContext('webgl2') || document.getElementById('canvas').getContext('webgl');
if (!gl) console.error('WebGL not supported');
console.log('ShadowMap support:', gl.getExtension('WEBGL_depth_texture') ? 'Available' : 'Not available');

// 씬, 카메라, 렌더러 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1e2a44'); // 어두운 블루 배경
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // 그림자 활성화
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자

// 오빗 컨트롤 설정
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 100;

// 토러스 지오메트리 및 재질
const torusGeometry = new THREE.TorusGeometry(10, 3, 16, 100);
const torusMaterial = new THREE.MeshPhongMaterial({ 
    color: '#ff6f61', // 코랄색
    shininess: 100, // 높은 광택
    specular: 0x555555 // 스페큘러 하이라이트
});
const torus = new THREE.Mesh(torusGeometry, torusMaterial);
torus.castShadow = true; // 그림자 드리우기
torus.receiveShadow = false;
scene.add(torus);

// 바닥면 지오메트리 및 재질
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.MeshPhongMaterial({ 
    color: '#aaaaaa', 
    side: THREE.DoubleSide,
    shininess: 30 // 적당한 광택
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI / 2; // 수평 바닥면
plane.position.y = -13; // 토러스 아래
plane.receiveShadow = true; // 그림자 받기
scene.add(plane);

// 조명 설정
const ambientLight = new THREE.AmbientLight(0x404040, 1.4); // 부드러운 주변광
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 100, 100, Math.PI / 4, 0.5, 1); // 스포트라이트
spotLight.position.set(10, 30, 10);
spotLight.castShadow = true; // 그림자 드리우기
spotLight.shadow.mapSize.width = 1024; // 높은 품질
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight);

// 디버깅 헬퍼 (선택적, 필요 시 주석 해제)
const spotLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotLightHelper);
const shadowCameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
scene.add(shadowCameraHelper);

// 카메라 위치 설정
camera.position.set(0, 15, 35);

// 애니메이션 루프
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// 윈도우 리사이즈 처리
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});