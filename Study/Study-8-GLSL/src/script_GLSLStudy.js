import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import Vert from "./glsl/vertex.glsl"
import Frag from "./glsl/fragment.glsl"

/* =======================/ SCENE /========================== */
const scene = new THREE.Scene();

/* =======================/ CAMERA /========================== */
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(1, 1, 3);

/* =======================/ RENDERER /========================== */
// WebGL 렌더러 생성
const renderer = new THREE.WebGLRenderer({antialias: true});
// 렌더링 할 화면의 크기 설정
renderer.setSize(innerWidth, innerHeight);
// 렌더러가 렌더링한 결과를 html 에 추가 - canvas 를 생성
document.body.appendChild(renderer.domElement);

/* =======================/ OBJECTS /========================== */
const geometry = new THREE.PlaneGeometry(10, 10, 30, 30);
// const geometry = new THREE.BoxGeometry(10, 10, 10, 10, 10, 10);
const material = new THREE.RawShaderMaterial({
    vertexShader: Vert,
    fragmentShader: Frag,
    wireframe: true,
});
const glslObject = new THREE.Mesh(geometry, material);
scene.add(glslObject);

/* =======================/ ORBIT CONTROLS /========================== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;


/* =======================/ WINDOW SIZE CONTROLS /========================== */
window.addEventListener('resize', onWindowResize);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* =======================/ ANIMATION /========================== */
function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate()