import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ============================================================
// 튜닝 파라미터
// ============================================================
const FLOWER_COUNT = 1200; // 꽃 개수
const PETALS_PER_FLOWER = 6; // 꽃 1개를 이루는 petal 개수 (leaf.glb 를 원형으로 복제)
const INSTANCE_COUNT = FLOWER_COUNT * PETALS_PER_FLOWER; // InstancedMesh 총 인스턴스 개수
const FIELD = 32 // 꽃밭 한 변의 길이
const RADIUS = 3.0; // 마우스 영향 반경 (이 안에서 0~1)
const DAMPING = 4.0; // 클수록 빠르게 열리고 닫힘

const SCALE = 0.3; // 모델링 기본 크기 (전체 배율)
const SCALE_VARIANCE = 0.4; // 개체별 크기 편차 (0 이면 전부 동일)
// → 실제 크기는 SCALE * (1 ± SCALE_VARIANCE) 범위에서 무작위

// --- 발광 / Bloom ---
const GLOW_COLOR = new THREE.Color(0x66ccff); // 꽃이 빛날 때의 색 (시안)
const GLOW_STRENGTH = 2.0; // 발광 세기. 1 을 넘겨야 bloom threshold 를 통과
const GLOW_GAMMA = 2.0; // 개화도→발광 곡선. 클수록 활짝 핀 꽃만 빛남

const BLOOM_STRENGTH = 1.0; // 번짐 세기
const BLOOM_RADIUS = 0.4; // 번짐 반경
const BLOOM_THRESHOLD = 0.5; // 이 밝기 이상만 번짐 (조명 받은 면이 새지 않도록)
// → 현재 GLOW_COLOR/GLOW_STRENGTH 조합에서 만개 시 최대 luminance 는 약 1.07.
//   threshold 를 이보다 낮게 잡아야 실제로 bloom 이 트리거된다.

// --- 파티클 (개화 시 위로 솟아오르는 이펙트) ---
const PARTICLE_MAX = 500; // 링버퍼 크기 (동시 최대 개수)
const PARTICLE_OPEN_THRESHOLD = 0.15; // 이 개화도 이상인 꽃에서만 생성
const PARTICLE_SPAWN_RATE = 5.0; // 열린 꽃 1개당 초당 생성 시도 횟수
const PARTICLE_SPAWN_RADIUS = 0.15; // 꽃 중심 기준 스폰 반경
const PARTICLE_LIFETIME_MIN = 1.2; // 수명(초) 최소
const PARTICLE_LIFETIME_MAX = 2.6; // 수명(초) 최대
const PARTICLE_RISE_SPEED_MIN = 0.6; // 상승 속도 최소
const PARTICLE_RISE_SPEED_MAX = 1.2; // 상승 속도 최대
const PARTICLE_DRIFT = 0.15; // xz 랜덤 흔들림 속도 범위
const PARTICLE_SIZE = 0.1; // 파티클 기본 크기 (월드 단위 근사치)
const PARTICLE_GLOW_STRENGTH = 2.5; // GLOW_COLOR 를 얼마나 밝게 뿜을지 (bloom 연동)

// ============================================================
// 1. Scene / Camera / Renderer
// ============================================================
const scene = new THREE.Scene();
const bgColor = 0x050505;
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.Fog(bgColor, 12, 40);

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.classList.add("blurred");
document.body.appendChild(renderer.domElement);

// ============================================================
// 2. Light
// ============================================================
scene.add(new THREE.HemisphereLight(0xffffff, 0x333355, 2.2));

const dirLight = new THREE.DirectionalLight(0xffffff, 12.5);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// ============================================================
// 3. Postprocessing — Bloom
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
// 4. Controls
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05; // 바닥 아래로 내려가지 않도록

// ============================================================
// 5. 마우스 → 지면(y=0) 월드 좌표
// ============================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(999, 999); // 화면 밖에서 시작
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorld = new THREE.Vector3(999, 0, 999);
let pointerInside = false;

function updatePointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  pointerInside = true;
}

window.addEventListener("pointermove", (e) => {
  updatePointer(e.clientX, e.clientY);
});

window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    updatePointer(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

window.addEventListener("pointerleave", () => {
  pointerInside = false;
});

window.addEventListener("touchend", () => {
  pointerInside = false;
});

// ============================================================
// 6. Title Overlay
// ============================================================
const titleOverlay = document.getElementById("titleOverlay");
const topGuide = document.getElementById("topGuide");
let titleShown = true;

function hideTitle() {
  if (titleShown) {
    titleOverlay.classList.add("hidden");
    renderer.domElement.classList.remove("blurred");
    setTimeout(() => {
      topGuide.classList.add("visible");
    }, 100);
    titleShown = false;
  }
}

titleOverlay.addEventListener("click", hideTitle);
titleOverlay.addEventListener("touchend", hideTitle);

window.addEventListener("keydown", (e) => {
  if (titleShown && e.key === " ") {
    e.preventDefault();
    hideTitle();
  }
});

// ============================================================
// 7. GLB 로드 → InstancedMesh 구성
// ============================================================
// setMorphAt(index, object) 는 object.morphTargetInfluences 만 읽으므로,
// 실제 Mesh 가 아닌 이 임시 객체로 인스턴스별 morph 가중치를 넘긴다.
const morphCarrier = { morphTargetInfluences: null };

let flowers = null; // InstancedMesh
let openAmount = null; // Float32Array, 인스턴스별 0~1
let basePos = null; // Float32Array(xz), 인스턴스별 월드 위치
let morphCount = 0;
let glowAttr = null; // InstancedBufferAttribute, 셰이더로 보내는 개화도

// ------------------------------------------------------------
// emissive 는 MeshStandardMaterial 셰이더에서 uniform (전 인스턴스 공유)이라
// 인스턴스별로 다르게 줄 수 없다. emissivemap_fragment 직후에 "인스턴스별
// 발광"을 더하는 한 줄만 끼워 넣어, baseColor/normalMap 등 원본 로직과
// Blender 룩은 그대로 유지한다.
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

  // 캐시 키를 바꿔 패치 전 셰이더가 재사용되는 것을 막는다
  mat.customProgramCacheKey = () => "flowerGlow";
}

const loader = new GLTFLoader();
loader.load(
  "./assets/leaf.glb",
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

    // petal(leaf.glb) 하나를 꽃 1개당 PETALS_PER_FLOWER 개 복제해 원형으로 배치
    flowers = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
    flowers.frustumCulled = false; // 인스턴스가 넓게 퍼지므로 컬링 비활성

    openAmount = new Float32Array(FLOWER_COUNT); // 꽃 단위 개화도 (petal 들이 공유)
    basePos = new Float32Array(FLOWER_COUNT * 2);
    morphCarrier.morphTargetInfluences = new Float32Array(morphCount);

    // 셰이더가 읽는 인스턴스별 발광도 — openAmount 와 같은 값을 GPU 버퍼로 올린 것
    glowAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(INSTANCE_COUNT),
      1,
    );
    glowAttr.setUsage(THREE.DynamicDrawUsage); // 매 프레임 갱신됨을 GPU 에 알림
    geometry.setAttribute("aGlow", glowAttr);

    const dummy = new THREE.Object3D();
    const half = FIELD / 2;
    const petalAngleStep = (Math.PI * 2) / PETALS_PER_FLOWER;

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const x = (Math.random() - 0.5) * FIELD;
      const z = (Math.random() - 0.5) * FIELD;
      const baseRotY = Math.random() * Math.PI * 2;
      // 꽃 단위로 통일 (petal 마다 다르지 않음)
      const s = SCALE * (1 + (Math.random() * 2 - 1) * SCALE_VARIANCE);

      basePos[i * 2] = x;
      basePos[i * 2 + 1] = z;

      // 같은 위치에서 petal 을 Y축 기준 균등 회전시켜 원형(꽃 모양)을 이룬다.
      for (let p = 0; p < PETALS_PER_FLOWER; p++) {
        const idx = i * PETALS_PER_FLOWER + p;

        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, baseRotY + p * petalAngleStep, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        flowers.setMatrixAt(idx, dummy.matrix);

        // 전부 닫힌 상태(0)로 시작 → morphTexture 가 여기서 생성된다
        morphCarrier.morphTargetInfluences.fill(0);
        flowers.setMorphAt(idx, morphCarrier);
      }
    }

    flowers.instanceMatrix.needsUpdate = true;
    flowers.morphTexture.needsUpdate = true;
    scene.add(flowers);

    // 카메라를 꽃밭 전체가 보이도록 맞춤
    controls.target.set(0, 0.5, 0);
    controls.update();

    console.log(
      `✅ InstancedMesh 준비 완료 — ${FLOWER_COUNT} flowers × ${PETALS_PER_FLOWER} petals = ${INSTANCE_COUNT} instances`,
    );
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
// 8. 파티클 — 개화 시 위로 솟아오르는 이펙트
// ============================================================
// flowers 로드 여부와 무관하게 항상 존재한다. flowers 가 없으면 스폰이 안 될 뿐이다.
const particleGeometry = new THREE.BufferGeometry();
const pPos = new Float32Array(PARTICLE_MAX * 3);
const pAlpha = new Float32Array(PARTICLE_MAX);
particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage),
);
particleGeometry.setAttribute(
  "aAlpha",
  new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage),
);

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: GLOW_COLOR },
    uStrength: { value: PARTICLE_GLOW_STRENGTH },
    uSize: { value: PARTICLE_SIZE },
    uPixelHeight: { value: window.innerHeight },
  },
  vertexShader: `
    uniform float uSize;
    uniform float uPixelHeight;
    attribute float aAlpha;
    varying float vAlpha;
    void main() {
      vAlpha = aAlpha;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      // 원근에 따라 화면상 크기가 일정하게 보이도록 보정
      gl_PointSize = uSize * uPixelHeight / -mvPosition.z;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uStrength;
    varying float vAlpha;
    void main() {
      // 점 안에서의 위치로 부드러운 원형 스프라이트를 그린다
      vec2 uv = gl_PointCoord - vec2(0.5);
      float circle = smoothstep(0.5, 0.0, length(uv));
      if (circle <= 0.0) discard;
      gl_FragColor = vec4(uColor * uStrength, circle * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
particles.frustumCulled = false;
scene.add(particles);

// 파티클 풀 상태 — 링버퍼 (가득 차면 가장 오래된 슬롯을 덮어씀)
const pVel = new Float32Array(PARTICLE_MAX * 3);
const pAge = new Float32Array(PARTICLE_MAX);
const pLife = new Float32Array(PARTICLE_MAX); // 0 이면 비활성
let nextParticle = 0;

function spawnParticle(x, z) {
  const idx = nextParticle;
  nextParticle = (nextParticle + 1) % PARTICLE_MAX;

  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * PARTICLE_SPAWN_RADIUS;
  pPos[idx * 3 + 0] = x + Math.cos(angle) * r;
  pPos[idx * 3 + 1] = 0.05;
  pPos[idx * 3 + 2] = z + Math.sin(angle) * r;

  pVel[idx * 3 + 0] = (Math.random() - 0.5) * PARTICLE_DRIFT;
  pVel[idx * 3 + 1] = THREE.MathUtils.lerp(
    PARTICLE_RISE_SPEED_MIN,
    PARTICLE_RISE_SPEED_MAX,
    Math.random(),
  );
  pVel[idx * 3 + 2] = (Math.random() - 0.5) * PARTICLE_DRIFT;

  pAge[idx] = 0;
  pLife[idx] = THREE.MathUtils.lerp(
    PARTICLE_LIFETIME_MIN,
    PARTICLE_LIFETIME_MAX,
    Math.random(),
  );
}

function updateParticles(dt) {
  const posAttr = particleGeometry.attributes.position;
  const alphaAttr = particleGeometry.attributes.aAlpha;

  for (let k = 0; k < PARTICLE_MAX; k++) {
    if (pLife[k] <= 0) continue;

    pAge[k] += dt;
    if (pAge[k] >= pLife[k]) {
      pLife[k] = 0;
      alphaAttr.array[k] = 0;
      continue;
    }

    pPos[k * 3 + 0] += pVel[k * 3 + 0] * dt;
    pPos[k * 3 + 1] += pVel[k * 3 + 1] * dt;
    pPos[k * 3 + 2] += pVel[k * 3 + 2] * dt;

    // 페이드 인 → 아웃 (수명 중간에 가장 밝음)
    const lifeT = pAge[k] / pLife[k];
    alphaAttr.array[k] = Math.sin(Math.PI * lifeT);
  }

  posAttr.needsUpdate = true;
  alphaAttr.needsUpdate = true;
}


// ============================================================
// 9. Resize
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // composer / bloom 도 같이 리사이즈해야 번짐이 어긋나지 않는다
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  // 파티클 크기의 원근 보정 기준도 같이 갱신
  particleMaterial.uniforms.uPixelHeight.value = window.innerHeight;
});

// ============================================================
// 10. Animate
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
    raycaster.ray.intersectPlane(groundPlane, mouseWorld);
  } else {
    // 커서가 나가면 모든 꽃이 닫히도록 아주 먼 곳으로
    mouseWorld.set(1e6, 0, 1e6);
  }

  // --- 인스턴스별 개화도 갱신 ---
  if (flowers) {
    const influences = morphCarrier.morphTargetInfluences;
    let bloomCount = 0;
    let maxOpen = 0;

    for (let i = 0; i < FLOWER_COUNT; i++) {
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

      // 꽃 1개 = petal PETALS_PER_FLOWER 개. 전부 같은 개화도를 공유한다.
      for (let p = 0; p < PETALS_PER_FLOWER; p++) {
        const idx = i * PETALS_PER_FLOWER + p;
        flowers.setMorphAt(idx, morphCarrier);
        // 같은 값을 셰이더용 attribute 에도 기록 → emissive 로 반영된다
        glowAttr.array[idx] = openAmount[i];
      }

      if (openAmount[i] > 0.05) bloomCount++;
      if (openAmount[i] > maxOpen) maxOpen = openAmount[i];

      // 열려있는 꽃에서 위로 솟아오르는 파티클을 조금씩 생성
      if (
        openAmount[i] > PARTICLE_OPEN_THRESHOLD &&
        Math.random() < PARTICLE_SPAWN_RATE * dt
      ) {
        spawnParticle(basePos[i * 2], basePos[i * 2 + 1]);
      }
    }

    flowers.morphTexture.needsUpdate = true;
    glowAttr.needsUpdate = true;
  }

  updateParticles(dt);

  controls.update();
  composer.render(); // bloom 을 거치므로 renderer.render 대신 composer
}

animate();

console.log("🌸 ShapeKey Flower Field — 마우스를 움직여 꽃을 피우세요");
