import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

// 장면 생성
const scene = new THREE.Scene();
// 장면 색상
scene.background = new THREE.Color(0x222222);

// 원근 적용 카메라 생성
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// WebGL 렌더러 생성
const renderer = new THREE.WebGLRenderer({antialias: true});
// 렌더링 할 화면의 크기 설정
renderer.setSize(innerWidth, innerHeight);
// 렌더러가 렌더링한 결과를 html에 추가 - canvas를 생성
document.body.appendChild(renderer.domElement);

// 지오메트리 생성
const geometry01 = new THREE.BoxGeometry(1.0, 1.0, 1.0);
// 머터리얼 생성
const material01 = new THREE.MeshLambertMaterial({color: 0xF48FB9});
const object1 = new THREE.Mesh(geometry01, material01);
object1.position.x = 0;
scene.add(object1);

// 라이트 생성
const color = 0xffffff;
const intensity = 1.0;
const DirectionalLight = new THREE.DirectionalLight(color, intensity);
DirectionalLight.position.set(-2, 2, 8);
scene.add(DirectionalLight);

const ambientLight = new THREE.AmbientLight( 0xaaaaaa );
scene.add( ambientLight );

// 오빗컨트롤 생성
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

camera.position.set(0, 0, 3);

// 윈도우 사이즈 변경시 대응
window.addEventListener('resize', onWindowResize);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 애니메이팅 기능
function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate()
