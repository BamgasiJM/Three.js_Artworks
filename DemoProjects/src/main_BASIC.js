import * as THREE from 'three';

// 씬, 카메라, 렌더러 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1e2a44'); // 어두운 블루 배경
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// 토러스 지오메트리 및 재질
const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshBasicMaterial({ color: '#ff6f61' }); // 코랄색
const torus = new THREE.Mesh(geometry, material);
scene.add(torus);

// 카메라 위치 설정
camera.position.z = 30;

// 애니메이션 루프
function animate() {
    requestAnimationFrame(animate);
    torus.rotation.x += 0.01;
    torus.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();

// 윈도우 리사이즈 시 처리
// 윈도우 크기 변경 시 렌더러와 카메라의 비율을 업데이트하여
// 그래픽이 항상 화면 중앙에 오도록 유지
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});