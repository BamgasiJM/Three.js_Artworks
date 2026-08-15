import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

async function init() {
  // 셰이더 파일 외부 로드
  const [vertRes, fragRes] = await Promise.all([
    fetch("./shaders/vert.glsl"),
    fetch("./shaders/frag.glsl"),
  ]);

  if (!vertRes.ok || !fragRes.ok) {
    console.error(
      "셰이더 파일을 로드할 수 없습니다. 로컬 서버(Live Server) 환경인지 확인하세요.",
    );
    return;
  }

  // Linter 전용 선언 블록(#ifndef THREE_RUNTIME)을 실제 컴파일에서
  // 제외시키기 위해 매크로를 정의합니다. GLSL 전처리기가 이 매크로를
  // 보고 vert.glsl / frag.glsl 상단의 가짜 선언 블록을 완전히 제거하므로,
  // Three.js가 자체 주입하는 position, cameraPosition 등의
  // 실제 선언과 충돌하지 않습니다.
  const RUNTIME_DEFINE = "#define THREE_RUNTIME\n";
  const vertexShader = RUNTIME_DEFINE + (await vertRes.text());
  const fragmentShader = RUNTIME_DEFINE + (await fragRes.text());

  const container = document.getElementById("canvas-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 2.8;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xf4f3f0, 1.0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // OrbitControls 설정 (댐핑 적용)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;

  // 상호작용을 위한 Raycaster 및 마우스 벡터
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-100, -100);

  const geometry = new THREE.SphereGeometry(1.2, 256, 256);
  const uniforms = {
    uTime: { value: 0.0 },
    uMousePos: { value: new THREE.Vector3(0, 0, 0) },
    uHover: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  const liquidMetalMesh = new THREE.Mesh(geometry, material);
  scene.add(liquidMetalMesh);

  // 마우스 이벤트 리스너
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  // 화면 리사이즈
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  const clock = new THREE.Clock();
  let targetHover = 0.0;

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    uniforms.uTime.value = elapsedTime;

    // Raycaster 업데이트 및 교차 판별
    raycaster.setFromCamera(mouse, camera);
    // Raycaster는 변형 전의 원본 구체 기하학 데이터를 기준으로 계산됩니다.
    const intersects = raycaster.intersectObject(liquidMetalMesh);

    if (intersects.length > 0) {
      targetHover = 1.0;
      // 교차점을 로컬 좌표계로 변환 (현재 씬에서 Mesh의 위치/비율 변화가 없으므로 월드와 동일하나 명시적 처리)
      const localPoint = intersects[0].point.clone();
      liquidMetalMesh.worldToLocal(localPoint);

      // 마우스 이동 시 노이즈 중심점이 부드럽게 따라오도록 선형 보간(Lerp) 적용
      uniforms.uMousePos.value.lerp(localPoint, 0.15);
    } else {
      targetHover = 0.0;
    }

    // 댐핑이 적용된 호버 강도 업데이트
    uniforms.uHover.value += (targetHover - uniforms.uHover.value) * 0.1;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

init();
