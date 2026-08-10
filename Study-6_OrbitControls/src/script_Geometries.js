import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

/* =======================/ SCENE /========================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xDDDDDD);

/* =======================/ CAMERA /========================== */
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

/* =======================/ RENDERER /========================== */
// 렌더러 생성, 화면 크기 설정
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(innerWidth, innerHeight);

// 렌더러가 렌더링한 결과를 html(document.body)에 추가(append) => canvas 를 생성
document.body.appendChild(renderer.domElement);

/* =======================/ OBJECTS /========================== */
// Object1 지오메트리 + 머터리얼 생성
const geometry01 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material01 = new THREE.MeshStandardMaterial({color: 0xFFFFFF});
const object1 = new THREE.Mesh(geometry01, material01);
object1.position.set(-1, 1, 0);
scene.add(object1);

// Object2 지오메트리 + 머터리얼 생성
const geometry02 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material02 = new THREE.MeshStandardMaterial({color: 0xFFFFFF});
const object2 = new THREE.Mesh(geometry02, material02);
object2.position.set(0, 1, 0);
scene.add(object2);

// Object3 지오메트리 + 머터리얼 생성
const geometry03 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material03 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object3 = new THREE.Mesh(geometry03, material03);
object3.position.set(1, 1, 0);
scene.add(object3);

// Object4 지오메트리 + 머터리얼 생성
const geometry04 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material04 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object4 = new THREE.Mesh(geometry04, material04);
object4.position.set(-1, 0, 0);
scene.add(object4);

// Object5 CENTER 지오메트리 + 머터리얼 생성
const geometry05 = new THREE.BoxGeometry(0.7, 0.7, 0.7, 5, 5, 5);
const material05 = new THREE.MeshLambertMaterial({color: 0x25aaB9, wireframe: true});
const object5 = new THREE.Mesh(geometry05, material05);
object5.position.set(0, 0, 0);
scene.add(object5);

// Object6 지오메트리 + 머터리얼 생성
const geometry06 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material06 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object6 = new THREE.Mesh(geometry06, material06);
object6.position.set(1, 0, 0);
scene.add(object6);

// Object7 지오메트리 + 머터리얼 생성
const geometry07 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material07 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object7 = new THREE.Mesh(geometry07, material07);
object7.position.set(-1, -1, 0);
scene.add(object7);

// Object8 지오메트리 + 머터리얼 생성
const geometry08 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material08 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object8 = new THREE.Mesh(geometry08, material08);
object8.position.set(0, -1, 0);
scene.add(object8);

// Object9 지오메트리 + 머터리얼 생성
const geometry09 = new THREE.BoxGeometry(0.7, 0.7, 0.7);
const material09 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
const object9 = new THREE.Mesh(geometry09, material09);
object9.position.set(1, -1, 0);
scene.add(object9);


/* =======================/ LIGHTS /========================== */

// 라이트 1 생성
const color = 0xffffff;
const intensity = 1.6;
const DirectionalLight = new THREE.DirectionalLight(color, intensity);
DirectionalLight.position.set(-2, 2, 5);
scene.add(DirectionalLight);

// 라이트 2 생성
const ambientLight = new THREE.AmbientLight(0xFFFFFF);
scene.add(ambientLight);


/* =======================/ ORBIT CONTROLS /========================== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;


/* =======================/ WINDOW SIZE CONTROLS /========================== */
// 윈도우 사이즈 변경시 대응
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* =======================/ ANIMATION /========================== */
function animate(time) {
    time *= 0.0003;
    object1.rotation.x = time;
    object2.rotation.x = time * 2;
    object3.rotation.x = time;
    object4.rotation.x = time * 2;
    object5.rotation.x = time;
    object6.rotation.x = time * 2;
    object7.rotation.x = time;
    object8.rotation.x = time * 2;
    object9.rotation.x = time;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate()
