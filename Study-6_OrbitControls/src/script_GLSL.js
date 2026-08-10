import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import Vert from './glsl/vertex.glsl'
import Frag from './glsl/fragment.glsl'


// 장면 생성
const scene = new THREE.Scene();

// 원근 적용 카메라 생성
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// WebGL 렌더러 생성
const renderer = new THREE.WebGLRenderer({antialias: true});
// 렌더링 할 화면의 크기 설정
renderer.setSize(innerWidth, innerHeight);
// 렌더러가 렌더링한 결과를 html에 추가 - canvas를 생성
document.body.appendChild(renderer.domElement);

// 지오메트리 생성
const geometry = new THREE.PlaneGeometry(10,10,20,20);
// 머터리얼 생성
// const material = new THREE.MeshPhongMaterial({color: 0xFF0FAA});
const material = new THREE.RawShaderMaterial({
    vertexShader: Vert,
    fragmentShader: Frag,
    wireframe: true,
});
const glsl_object = new THREE.Mesh(geometry, material);

scene.add(glsl_object);

// 오빗컨트롤 생성
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

camera.position.set(1, 1, 2);

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
