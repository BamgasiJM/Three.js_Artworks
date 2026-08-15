import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

// 장면 생성, 색상 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171717);

const width = window.innerWidth;
const height = window.innerHeight;

// 카메라 생성, 카메라 종류/위치 설정
const camera = new THREE.PerspectiveCamera(
    70,
    width / height,
    0.01,
    1000);
camera.position.set(0, 0, 2);

// 렌더러 생성, 화면 크기 설정
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
// renderer.setAnimationLoop(animate);    // 저 밑에서 requestAnimationFrame 으로 하고 있으니 이건 중복.

// 렌더러가 렌더링한 결과를 html(document.body)에 추가(append) => canvas를 생성
document.body.appendChild(renderer.domElement);

// 지오메트리 + 매터리얼 = 메쉬 : 씬에 메쉬를 추가
const geometry = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10);
const material = new THREE.MeshNormalMaterial({wireframe: true});
const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);

// 오빗컨트롤 생성11
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 스탯 창 추가
const stats = Stats();
document.body.appendChild(stats.dom);

// 애니메이션
function animate(time) {
    mesh.rotation.x = time / 9000;
    mesh.rotation.y = time / 9000;
    mesh.rotation.z = time / 9000;

    controls.update();
    renderer.render(scene, camera);
    stats.update();                             // 스탯 창 업데이트
    requestAnimationFrame(animate);


}
animate();