import * as THREE from "three";

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene (여기서 백그라운드 컬러 변경)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x005172);

// Object 1
const geometry01 = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material01 = new THREE.MeshPhongMaterial({ color: 0x00bbcc });
const object1 = new THREE.Mesh(geometry01, material01); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
object1.position.x = -1;
scene.add(object1);

// Object 2
const geometry02 = new THREE.ConeGeometry(0.4, 0.6, 8);
const material02 = new THREE.MeshPhongMaterial({ color: 0x00bbcc });
const object2 = new THREE.Mesh(geometry02, material02); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
object2.position.x = 0;
scene.add(object2);

// Object 3
const geometry03 = new THREE.IcosahedronGeometry(0.4, 0);
const material03 = new THREE.MeshPhongMaterial({ color: 0x00bbcc });
const object3 = new THREE.Mesh(geometry03, material03); // 위의 스펙대로 오브젝트 만들기 (이름은 변동)
object3.position.x = 1;
scene.add(object3);

// Light
const color = 0xffffff;
const intensity = 1.5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-2, 2, 8);
scene.add(light);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: 500,
};

// Camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height);
camera.position.z = 2;
scene.add(camera);

function render(time) {
  time *= 0.0004; // convert time to seconds
  object1.rotation.x = time;
  object2.rotation.x = time;
  object2.rotation.y = time;
  object3.rotation.z = time;

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);

/*
// 1) resize 이벤트 리스너 추가
window.addEventListener("resize", () => {
    // 2) 기본 size 업데이트
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // 3) camera 종횡비 업데이트
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix(); //<-- 카메라의 프로젝션 매트릭스 업데이트

    // 4) renderer 사이즈 업데이트
    renderer.setSize(sizes.width, sizes.height);

    // 4) final 렌더링
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.render(scene, camera);
});*/
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
