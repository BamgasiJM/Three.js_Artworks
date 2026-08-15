import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// 장면 생성, 색상 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171717);

const width = window.innerWidth;
const height = window.innerHeight;

// 카메라 생성, 카메라 종류/위치 설정

const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
camera.position.set(0, 0, 2);

// 렌더러 생성, 화면 크기 설정
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
// renderer.setAnimationLoop(animate);    // 저 밑에서 requestAnimationFrame 으로 하고 있으니 이건 중복.

// 렌더러가 렌더링한 결과를 html(document.body)에 추가(append) => canvas를 생성
document.body.appendChild(renderer.domElement);

// 오빗컨트롤 생성11
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

/****************************************/

// // Object 1
// const geometry01 = new THREE.BoxGeometry(0.5, 0.5, 0.5);
// const material01 = new THREE.MeshLambertMaterial({ color: 0x00bbcc });
// const object1 = new THREE.Mesh(geometry01, material01); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
// object1.position.x = -1;
// scene.add(object1);

// Object 2
const geometry02 = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
const material02 = new THREE.MeshPhongMaterial({
  color: 0x009988,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  wireframe: false,
});
const object2 = new THREE.Mesh(geometry02, material02); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
object2.position.x = 0;
scene.add(object2);

// // Object 3
// const geometry03 = new THREE.IcosahedronGeometry(0.4, 0);
// const material03 = new THREE.MeshPhongMaterial({ color: 0x00bbcc });
// const object3 = new THREE.Mesh(geometry03, material03); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
// object3.position.x = 1;
// scene.add(object3);

// Light
const color = 0xffffff;
const intensity = 1.5;
const light1 = new THREE.DirectionalLight(color, intensity);
light1.position.set(-2, 2, 8);
scene.add(light1);

const light2 = new THREE.AmbientLight(0xffffff, 0.5); // soft #ffffff light
scene.add(light2);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/****************************************/

function render(time) {
  time *= 0.0001; // convert time to seconds
  // object1.rotation.x = time;
  object2.rotation.x = time;
  object2.rotation.y = time;
  // object3.rotation.z = time;

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// resize 이벤트 리스너 추가
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix(); //<-- 카메라의 프로젝션 매트릭스 업데이트

  renderer.setSize(sizes.width, sizes.height);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.render(scene, camera);
});

window.addEventListener("dblclick", () => {
  const fullscreenElement =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (!fullscreenElement) {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
      canvas.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
});
