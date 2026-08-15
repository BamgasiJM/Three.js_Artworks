import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ============================================================
// 튜닝 파라미터
// ===========================================================
const COUNT = 600; // 인스턴스 개수
const FIELD = 32 // 꽃밭 한 변의 길이
const RADIUS = 3.0; // 마우스 영향 반경 (이 안에서 0~1)
const DAMPING = 4.0; // 클수록 빠르게 열리고 닫힘

const SCALE = 0.7; // 모델링 기본 크기 (전체 배율)
const SCALE_VARIANCE = 0.4; // 개체별 크기 편차 (0 이면 전부 동일)
// → 실제 크기는 SCALE * (1 ± SCALE_VARIANCE) 범위에서 무작위

// --- 발광 / Bloom ---
const GLOW_COLOR = new THREE.Color(0x66ccff); // 꽃이 빛날 때의 색 (시안)
const GLOW_STRENGTH = 2.0; // 발광 세기. 1 을 넘겨야 bloom threshold 를 통과
const GLOW_GAMMA = 2.0; // 개화도→발광 곡선. 클수록 활짝 핀 꽃만 빛남

const BLOOM_STRENGTH = 1.1; // 번짐 세기
const BLOOM_RADIUS = 0.6; // 번짐 반경
const BLOOM_THRESHOLD = 1.0; // 이 밝기 이상만 번짐 (조명 받은 면이 새지 않도록)

// ============================================================
// 1. Scene / Camera / Renderer
// ============================================================
const scene = new THREE.Scene();
const bgColor = 0x050505;
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 12, 50);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// 발광부가 1.0 을 넘어도 흰색으로 뭉개지지 않고 색을 유지하도록 톤매핑.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ============================================================
// 2. Light
// ============================================================
scene.add(new THREE.HemisphereLight(0xffffff, 0x333355, 9.2));

const dirLight = new THREE.DirectionalLight(0xffffff, 6.5);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// ============================================================
// 2-b. Postprocessing — Bloom
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
);
composer.addPass(bloomPass);

// OutputPass 가 톤매핑 + sRGB 변환을 담당한다.
// EffectComposer 를 쓸 때는 이게 없으면 색이 씻긴 것처럼 나온다.
composer.addPass(new OutputPass());

// ============================================================
// 3. Controls
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05; // 바닥 아래로 내려가지 않도록

// ============================================================
// 4. 마우스 → 지면(y=0) 월드 좌표
// ============================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(999, 999); // 화면 밖에서 시작
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorld = new THREE.Vector3(999, 0, 999);
let pointerInside = false;

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointerInside = true;
});

window.addEventListener("pointerleave", () => {
  pointerInside = false;
});

// ============================================================
// 5. HUD
// ============================================================
const hud = {
  morph: document.getElementById("hudMorph"),
  mouse: document.getElementById("hudMouse"),
  bloom: document.getElementById("hudBloom"),
  max: document.getElementById("hudMax"),
};

// ============================================================
// 6. GLB 로드 → InstancedMesh 구성
// ============================================================
// 인스턴스별 morph 가중치를 setMorphAt 에 넘기기 위한 임시 객체.
// setMorphAt(index, object) 는 object.morphTargetInfluences 를 읽으므로
// 실제 Mesh 가 아니어도 해당 프로퍼티만 있으면 된다.
const morphCarrier = { morphTargetInfluences: null };

let flowers = null; // InstancedMesh
let openAmount = null; // Float32Array, 인스턴스별 0~1
let basePos = null; // Float32Array(xz), 인스턴스별 월드 위치
let morphCount = 0;
let glowAttr = null; // InstancedBufferAttribute, 셰이더로 보내는 개화도

// ------------------------------------------------------------
// Blender 머티리얼을 유지한 채 emissive 만 인스턴스별로 제어한다.
//
// MeshStandardMaterial 의 프래그먼트 셰이더에는
//   vec3 totalEmissiveRadiance = emissive;   // ← emissive 는 uniform (전 인스턴스 공유)
//   #include <emissivemap_fragment>
//   ...
//   vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
// 라는 흐름이 있다.
//
// emissive 가 uniform 이라 인스턴스별로 다르게 줄 수 없으므로,
// emissivemap_fragment 직후에 "인스턴스별 발광"을 더하는 한 줄을 끼워 넣는다.
// baseColor/normalMap 등 원본 로직은 손대지 않으므로 Blender 룩이 유지된다.
// ------------------------------------------------------------
function patchMaterialForGlow(mat) {
  mat.onBeforeCompile = (shader) => {
    // --- vertex: 인스턴스 attribute 를 읽어 fragment 로 넘긴다 ---
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aGlow;
        varying float vGlow;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vGlow = aGlow;`,
      );

    // --- fragment: 개화도에 비례한 발광을 더한다 ---
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vGlow;
        uniform vec3 uGlowColor;
        uniform float uGlowStrength;
        uniform float uGlowGamma;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // pow 로 곡선을 조절 — 반쯤 열린 꽃은 어둡고, 활짝 핀 꽃만 확 빛난다
        float glow = pow( clamp( vGlow, 0.0, 1.0 ), uGlowGamma );
        totalEmissiveRadiance += uGlowColor * uGlowStrength * glow;`,
      );

    // uniform 주입. 여기 담은 객체를 밖에서도 참조할 수 있게 보관해두면
    // 런타임에 색/세기를 바꿀 수 있다.
    shader.uniforms.uGlowColor = { value: GLOW_COLOR };
    shader.uniforms.uGlowStrength = { value: GLOW_STRENGTH };
    shader.uniforms.uGlowGamma = { value: GLOW_GAMMA };
    mat.userData.shader = shader;
  };

  // onBeforeCompile 을 바꿨으면 캐시 키도 바꿔줘야 한다.
  // 같은 프로그램으로 오인해서 패치 전 셰이더를 재사용하는 것을 막는다.
  mat.customProgramCacheKey = () => "flowerGlow";
}

const loader = new GLTFLoader();
loader.load(
  "./assets/shapekey.glb",
  (gltf) => {
    // --- 모델에서 morph target 을 가진 첫 메쉬를 찾는다 ---
    let src = null;
    gltf.scene.traverse((node) => {
      if (!src && node.isMesh && node.geometry.morphAttributes?.position) {
        src = node;
      }
    });

    if (!src) {
      console.error(
        "❌ morph target(셰이프 키)을 가진 메쉬를 찾지 못했습니다.\n" +
          "   Blender에서 glTF export 시 'Shape Keys' 옵션이 켜져 있는지 확인하세요.",
      );
      return;
    }

    const geometry = src.geometry;
    const material = src.material;
    morphCount = geometry.morphAttributes.position.length;

    console.log("📊 Morph 정보");
    console.log("  mesh:", src.name);
    console.log("  morph target 개수:", morphCount);
    console.log("  dictionary:", geometry.morphTargetDictionary);
    console.log("  morphTargetsRelative:", geometry.morphTargetsRelative);

    // --- 머티리얼에 발광 훅을 심는다 (원본 텍스처/색은 그대로) ---
    patchMaterialForGlow(material);

    // --- InstancedMesh 생성 ---
    flowers = new THREE.InstancedMesh(geometry, material, COUNT);
    flowers.frustumCulled = false; // 인스턴스가 넓게 퍼지므로 컬링 비활성

    openAmount = new Float32Array(COUNT);
    basePos = new Float32Array(COUNT * 2);
    morphCarrier.morphTargetInfluences = new Float32Array(morphCount);

    // 셰이더가 읽을 인스턴스별 발광도.
    // openAmount 와 같은 값이지만, 이쪽은 GPU 로 올라가는 버퍼다.
    glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(COUNT), 1);
    glowAttr.setUsage(THREE.DynamicDrawUsage); // 매 프레임 갱신됨을 GPU 에 알림
    geometry.setAttribute("aGlow", glowAttr);

    const dummy = new THREE.Object3D();
    const half = FIELD / 2;

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * FIELD;
      const z = (Math.random() - 0.5) * FIELD;

      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      // SCALE 을 중심으로 ±SCALE_VARIANCE 만큼 무작위 편차
      const s = SCALE * (1 + (Math.random() * 2 - 1) * SCALE_VARIANCE);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);

      basePos[i * 2] = x;
      basePos[i * 2 + 1] = z;

      // 전부 닫힌 상태(0)로 시작 → morphTexture 가 여기서 생성된다
      morphCarrier.morphTargetInfluences.fill(0);
      flowers.setMorphAt(i, morphCarrier);
    }

    flowers.instanceMatrix.needsUpdate = true;
    flowers.morphTexture.needsUpdate = true;
    scene.add(flowers);

    // 카메라를 꽃밭 전체가 보이도록 맞춤
    controls.target.set(0, 0.5, 0);
    controls.update();

    hud.morph.textContent = `${morphCount} target(s)`;
    console.log(`✅ InstancedMesh 준비 완료 — ${COUNT} instances (half=${half})`);
  },
  (p) => {
    if (p.total) {
      console.log(`로딩중: ${((p.loaded / p.total) * 100).toFixed(0)}%`);
    }
  },
  (err) => {
    console.error("❌ GLB 로드 실패:", err);
  },
);

// ============================================================
// 7. 바닥 (위치 감각용 그리드)
// ============================================================
const grid = new THREE.GridHelper(FIELD, FIELD, 0x334455, 0x223344);
grid.position.y = -0.01;
scene.add(grid);

// 마우스 영향 반경 시각화 링
const ring = new THREE.Mesh(
  new THREE.RingGeometry(RADIUS - 0.06, RADIUS, 64),
  new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
ring.visible = false;
scene.add(ring);

// ============================================================
// 8. Resize
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // composer / bloom 도 같이 리사이즈해야 번짐이 어긋나지 않는다
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

// ============================================================
// 9. Animate
// ============================================================
const clock = new THREE.Clock();
let frame = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  frame++;

  // --- 마우스 월드 좌표 갱신 ---
  if (pointerInside) {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, mouseWorld);
    ring.visible = hit !== null;
    if (hit) ring.position.set(mouseWorld.x, 0.02, mouseWorld.z);
  } else {
    // 커서가 나가면 모든 꽃이 닫히도록 아주 먼 곳으로
    mouseWorld.set(1e6, 0, 1e6);
    ring.visible = false;
  }

  // --- 인스턴스별 개화도 갱신 ---
  if (flowers) {
    const influences = morphCarrier.morphTargetInfluences;
    let bloomCount = 0;
    let maxOpen = 0;

    for (let i = 0; i < COUNT; i++) {
      const dx = basePos[i * 2] - mouseWorld.x;
      const dz = basePos[i * 2 + 1] - mouseWorld.z;
      const dist = Math.hypot(dx, dz);

      // 거리 → 목표 개화도 (0~1). smoothstep 으로 가장자리를 부드럽게.
      const t = THREE.MathUtils.clamp(1 - dist / RADIUS, 0, 1);
      const target = t * t * (3 - 2 * t);

      // 프레임레이트 독립적인 지수 감쇠 보간
      openAmount[i] = THREE.MathUtils.damp(openAmount[i], target, DAMPING, dt);

      // morph 가중치 기록. target 이 여러 개면 첫 번째를 개화도로 사용.
      influences[0] = openAmount[i];
      flowers.setMorphAt(i, morphCarrier);

      // 같은 값을 셰이더용 attribute 에도 기록 → emissive 로 반영된다
      glowAttr.array[i] = openAmount[i];

      if (openAmount[i] > 0.05) bloomCount++;
      if (openAmount[i] > maxOpen) maxOpen = openAmount[i];
    }

    flowers.morphTexture.needsUpdate = true;
    glowAttr.needsUpdate = true;

    // --- HUD (6프레임마다) ---
    if (frame % 6 === 0) {
      hud.mouse.textContent = pointerInside
        ? `${mouseWorld.x.toFixed(1)}, ${mouseWorld.z.toFixed(1)}`
        : "outside";
      hud.bloom.textContent = `${bloomCount} / ${COUNT}`;
      hud.max.textContent = maxOpen.toFixed(3);
    }
  }

  controls.update();
  composer.render(); // bloom 을 거치므로 renderer.render 대신 composer
}

animate();

console.log("🌸 ShapeKey Flower Field — 마우스를 움직여 꽃을 피우세요");
