# Iron Flower — 구현 워크스루

`main.js`에 매겨둔 섹션 번호(1~10) 순서 그대로, 각 파트에서 실제로 어떤 일이 일어나는지 자세히 풀어썼다. 개요/사용자 흐름은 [README.md](./README.md) 참고.

## 1. Scene / Camera / Renderer

```javascript
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

기본 렌더러는 셰이더가 계산한 linear 색상값을 그대로 0~1로 clamp해서 화면에 낸다. 조명·발광 값이 1을 넘어가면(이 프로젝트의 `GLOW_STRENGTH = 2.0`처럼) 그냥 하얗게 뭉개진다. `ACESFilmicToneMapping`은 영화 산업 표준인 ACES(Academy Color Encoding System) 커브를 적용해서, 1을 넘는 밝은 값도 부드럽게 압축해 디테일이 남도록(하이라이트 롤오프) 재매핑해준다. 어두운 영역은 거의 그대로 두고 밝은 영역만 부드럽게 눌러주기 때문에 대비감 있는 "영화 같은" 톤이 나온다.

`toneMappingExposure`는 이 커브에 들어가기 전에 곱해지는 노출값이다. 1.0보다 크게 하면 전체적으로 밝게, 작게 하면 어둡게 노출된 것처럼 보이며, 이 프로젝트는 기본값(1.0)을 그대로 사용한다.

나머지는 표준 설정이다: `PerspectiveCamera(fov=55, aspect, near=0.1, far=200)`로 시야각을 잡고, `setPixelRatio(Math.min(devicePixelRatio, 2))`로 레티나 디스플레이에서도 렌더 비용이 과하게 튀지 않도록 상한을 둔다. `renderer.domElement`에 처음부터 `blurred` 클래스를 붙여두는 건 타이틀 오버레이가 떠 있는 동안 배경 캔버스를 블러 처리하기 위함이다(6번 참고).

## 2. Light

`HemisphereLight`(하늘색/땅색 앰비언트)와 `DirectionalLight` 하나만 사용하는 단순한 조명 구성이다. 발광은 조명이 아니라 3번·7번에서 다루는 emissive/Bloom 파이프라인이 담당한다.

## 3. Postprocessing — Bloom

```javascript
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(resolution, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD));
composer.addPass(new OutputPass());
```

`renderer.render(scene, camera)`를 직접 부르면 화면에 한 번에 그려서 끝나지만, "화면 전체를 이미지로 놓고 그 위에 효과를 덧입히는" 후처리(bloom, DoF, 색보정 등)를 하려면 중간 결과를 오프스크린 텍스처에 담아 다음 단계로 넘겨줄 파이프라인이 필요하다. `EffectComposer`가 그 파이프라인 관리자다.

- **`composer.addPass(pass)`**: 패스를 실행 순서대로 등록한다. `composer.render()`가 호출되면 등록된 패스를 순서대로 실행하는데, 각 패스는 이전 패스가 그려둔 텍스처를 입력으로 받아 자기 텍스처(또는 최종 화면)에 결과를 쓴다 — 일종의 이미지 처리 체인.
- **`RenderPass(scene, camera)`**: 체인의 첫 단계. `renderer.render`과 동일하게 씬을 카메라 시점으로 평범하게 그리되, 그 결과를 화면이 아니라 컴포저의 내부 렌더 타겟(텍스처)에 담아 다음 패스가 쓸 수 있게 한다.
- **`UnrealBloomPass(resolution, strength, radius, threshold)`**: 언리얼 엔진 스타일의 블룸을 구현한 패스. 내부적으로 ①입력 이미지에서 `threshold`보다 밝은 픽셀만 추출하고, ②그걸 여러 해상도(mip 단계)로 다운샘플링하며 가우시안 블러를 반복 적용해 부드러운 번짐을 만든 뒤, ③다시 원본 위에 `strength` 세기로 더해(additive) 합성한다. `radius`는 이 블러가 얼마나 넓게 퍼질지를 조절한다. 즉 "밝은 부분만 골라서, 흐리게, 강하게 덧씌우는" 3단계가 패스 하나에 캡슐화돼 있다.
- **`OutputPass`**: 체인의 마지막 단계. `renderer.render`를 직접 쓸 때는 렌더러가 알아서 톤매핑 + 색공간(sRGB) 변환을 해주지만, `EffectComposer`의 중간 렌더 타겟들은 이 변환 없이 linear 값 그대로 주고받는다. 그래서 마지막에 `OutputPass`가 한 번 더 톤매핑과 sRGB 변환을 걸어줘야 실제 모니터에 보이는 색이 맞게 나온다. 이게 빠지면 전체적으로 색이 씻긴 듯 흐리게 보인다.

애니메이션 루프에서는 `renderer.render()` 대신 `composer.render()`를 호출해 이 체인 전체를 매 프레임 실행한다(10번 참고).

## 4. Controls

```javascript
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
```

- **`enableDamping`**: 마우스를 놓아도 관성이 남아 카메라가 서서히 멈추도록 하는 옵션이다. 내부적으로 매 프레임 목표 각도/거리로 `dampingFactor`(기본 0.05)만큼 지수적으로 수렴시키는데, 이 보간이 실제로 적용되려면 애니메이션 루프에서 `controls.update()`를 매 프레임 호출해줘야 한다(10번에서 호출).
- **Polar angle(극각)**: Y축(수직) 기준으로 카메라가 얼마나 위/아래로 기울었는지를 나타내는 각도다. 0이면 정확히 위(하늘)에서 내려다보는 것, `Math.PI`(180°)면 정확히 아래에서 올려다보는 것, `Math.PI/2`(90°)면 정면(지평선 높이)이다. `maxPolarAngle = Math.PI / 2.05`는 90°보다 살짝 작은 값으로, 카메라가 지평선을 살짝 넘어 바닥 아래로 파고드는 것을 막는다. `minPolarAngle`은 지정하지 않아 기본값(0, 정수리 위)까지 자유롭게 올라간다.
- **Azimuth angle(방위각)**: Y축을 중심으로 카메라가 좌우로 도는 각도다. 이 프로젝트는 `minAzimuthAngle` / `maxAzimuthAngle`을 건드리지 않아 기본값(`-Infinity` / `Infinity`)이 유지되므로, 꽃밭을 중심으로 360도 자유롭게 회전할 수 있다 — 상하 각도만 제한하고 좌우 회전은 열어둔 셈이다.

## 5. Raycasting — 마우스 좌표 → 지면 위 월드 좌표

화면의 마우스 좌표(px)를 3D 씬의 지면(y=0) 위 한 점으로 바꾸는 과정이다.

```javascript
pointer.x = (clientX / window.innerWidth) * 2 - 1;
pointer.y = -(clientY / window.innerHeight) * 2 + 1;
```

먼저 픽셀 좌표를 NDC(Normalized Device Coordinate, -1~1 범위)로 정규화한다. 화면 좌표는 위쪽이 0이고 아래로 갈수록 커지지만 NDC는 위가 +1, 아래가 -1이라 y는 부호를 뒤집어야 한다.

```javascript
raycaster.setFromCamera(pointer, camera);
raycaster.ray.intersectPlane(groundPlane, mouseWorld);
```

- **`raycaster.setFromCamera(ndcPointer, camera)`**: NDC 좌표 한 점을 카메라의 위치·투영행렬 기준으로 역투영해서, "카메라에서 그 화면 픽셀 방향으로 뻗어나가는" 3D 레이(`raycaster.ray`, `Ray { origin, direction }`)를 만들어준다.
- **`groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)`**: 법선이 (0,1,0)이고 원점을 지나는 무한 평면 — 즉 y=0인 바닥면 전체.
- **`ray.intersectPlane(plane, targetVector)`**: 레이와 평면의 교차점을 계산해 `targetVector`(`mouseWorld`)에 채워 넣는다. 레이가 평면과 평행하는 등 교차점이 없으면 `null`을 반환한다.

이 방식의 장점은 실제 꽃 메쉬들과 레이캐스팅(개별 오브젝트 교차 판정)을 할 필요가 없다는 것이다. 꽃이 몇 개든, 인스턴스가 몇 개든 상관없이 "마우스가 가리키는 바닥 위의 점"만 한 번 계산하면, 나머지는 그 점과 각 꽃의 저장된 xz 좌표 사이의 단순한 2D 거리 계산으로 끝난다(10번 참고).

## 6. Title Overlay

DOM 오버레이(`titleOverlay`, `topGuide`)를 클릭/스페이스바/터치로 닫으면서 캔버스의 블러를 해제하고 가이드 문구를 페이드인시키는 순수 UI 로직이다. Three.js와는 무관한 CSS 클래스 토글이라 별도 설명은 생략.

## 7. GLB 로드 → InstancedMesh 구성

이 프로젝트에서 가장 중요한 파트. "꽃잎 하나의 3D 모델"을 "7,200장이 각자 다른 위치·회전·개화 상태로 존재하는 꽃밭"으로 바꾸는 전체 공정이다.

### 7-1. 모델 로드와 morph target 탐색

```javascript
loader.load("./assets/leaf.glb", onLoad, onProgress, onError);
```

`GLTFLoader.load`는 콜백 3개(성공/진행률/실패)를 받는 비동기 로더다. 성공 콜백 안에서 가장 먼저 하는 일은 `gltf.scene.traverse`로 씬 그래프를 순회하면서 `node.geometry.morphAttributes?.position`이 존재하는 첫 메쉬를 찾는 것이다.

여기가 **"닫힌 꽃/핀 꽃, 두 상태가 코드에서 어떻게 감지되는가"**의 핵심이다. Blender에서 Shape Key(기본 형태 + "핀 상태" 형태 하나)를 만들어 glTF로 export하면, 그 메쉬의 `geometry.morphAttributes.position`에 각 Shape Key별 정점 오프셋 배열이 담긴다. 즉 두 상태는 이름이나 별도 플래그로 구분되는 게 아니라, **"기본 지오메트리 + Shape Key 오프셋 하나를 얼마나 섞을지(0~1)"** 라는 morph weight 하나로 표현된다. `morphCount = geometry.morphAttributes.position.length`가 이 Shape Key 개수(여기서는 1개)이고, 코드 전체에서 `morphTargetInfluences[0]` 딱 하나만 사용해 이 가중치를 0(완전히 닫힘, 원본 지오메트리)~1(완전히 핌, Shape Key가 100% 반영된 형태) 사이로 조절한다.

```javascript
console.log("  dictionary:", geometry.morphTargetDictionary);
console.log("  morphTargetsRelative:", geometry.morphTargetsRelative);
```

이 로그들은 export가 의도대로 됐는지 확인하기 위한 디버그용으로, Shape Key 이름→인덱스 매핑과 상대/절대 모프 방식 여부를 보여준다.

### 7-2. InstancedMesh 생성과 GPU 버퍼 준비

```javascript
flowers = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
flowers.frustumCulled = false;
```

`InstancedMesh`는 같은 geometry/material 조합을 GPU 인스턴싱으로 한 번의 draw call에 그려준다. 일반 `Mesh`라면 인스턴스마다 별도 오브젝트+드로우콜이 필요했겠지만, 여기선 7,200개 petal이 통째로 1회 드로우콜로 그려진다. `frustumCulled = false`인 이유는 InstancedMesh의 기본 바운딩 볼륨이 (인스턴스 배치를 반영하지 않고) 원본 geometry 기준으로만 계산되기 때문에, 꽃밭처럼 인스턴스가 넓게 퍼진 경우 화면 가장자리 근처 꽃들이 잘못 컬링(제외)될 수 있어 아예 컬링을 끈 것이다.

일반 `Mesh`의 morph weight는 `mesh.morphTargetInfluences`라는 배열 하나(모든 정점에 공통 적용)로 충분하지만, `InstancedMesh`는 인스턴스마다 다른 morph weight가 필요하다. Three.js는 이를 위해 내부적으로 `morphTexture`라는 `DataTexture`를 만들어 관리한다(인스턴스 수 × morph 개수 크기). `setMorphAt(index, object)`를 호출하면 `object.morphTargetInfluences` 배열을 읽어 그 인스턴스 행(row)에 해당하는 텍스처 픽셀들에 써준다 — 그래서 실제 Mesh가 아닌 `morphCarrier = { morphTargetInfluences }` 같은 가벼운 객체로도 충분한 것이다.

```javascript
glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(INSTANCE_COUNT), 1);
glowAttr.setUsage(THREE.DynamicDrawUsage);
geometry.setAttribute("aGlow", glowAttr);
```

3번(Bloom)과 별개로, "인스턴스별 발광"을 셰이더에 전달하기 위한 커스텀 attribute(`aGlow`)도 여기서 준비한다. `DynamicDrawUsage`는 이 버퍼가 매 프레임 갱신될 것임을 GPU 드라이버에 힌트로 알려줘 드라이버가 그에 맞는 메모리 전략을 쓰게 한다(이 발광 로직의 셰이더 패치 자체는 `patchMaterialForGlow` 함수에서 처리하며 자세한 내용은 README의 "인스턴스별 발광" 절 참고).

### 7-3. 인스턴스 배치 루프

```javascript
for (let i = 0; i < FLOWER_COUNT; i++) {
  const x = (Math.random() - 0.5) * FIELD;
  const z = (Math.random() - 0.5) * FIELD;
  const baseRotY = Math.random() * Math.PI * 2;
  const s = SCALE * (1 + (Math.random() * 2 - 1) * SCALE_VARIANCE);
  ...
  for (let p = 0; p < PETALS_PER_FLOWER; p++) {
    const idx = i * PETALS_PER_FLOWER + p;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, baseRotY + p * petalAngleStep, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    flowers.setMatrixAt(idx, dummy.matrix);

    morphCarrier.morphTargetInfluences.fill(0);
    flowers.setMorphAt(idx, morphCarrier);
  }
}
```

바깥 루프는 "꽃(1,200개)" 단위, 안쪽 루프는 그 꽃을 이루는 "petal(6장)" 단위다. 꽃 하나당 랜덤한 (x, z) 위치, 랜덤한 기준 회전각(`baseRotY`), 랜덤한 스케일(`s`)을 한 번만 뽑고, petal 6장은 같은 위치·스케일을 공유한 채 `baseRotY + p * petalAngleStep`(360°를 6등분한 간격)만큼씩 Y축으로 회전시켜 원형으로 펼친다 — dummy `Object3D`에 TRS를 세팅하고 `updateMatrix()`로 4×4 행렬을 만든 뒤 `setMatrixAt(idx, matrix)`로 해당 인스턴스의 변환 행렬을 기록하는, InstancedMesh의 표준 배치 패턴이다.

각 인스턴스는 `morphTargetInfluences.fill(0)` (완전히 닫힌 상태) 로 `setMorphAt`을 한 번 호출해 초기값을 심어둔다 — 이 최초 호출들이 사실상 `morphTexture`를 처음 생성/채우는 과정이다.

```javascript
flowers.instanceMatrix.needsUpdate = true;
flowers.morphTexture.needsUpdate = true;
```

루프가 다 끝난 뒤 두 플래그를 한 번만 켜서, 7,200번의 개별 GPU 업로드 대신 배치가 끝난 시점에 한 번씩만 CPU→GPU 전송이 일어나게 한다.

## 8. 파티클 — 개화 시 위로 솟아오르는 이펙트

메쉬가 아니라 `THREE.Points` + 커스텀 셰이더로 만든, "생성 → 수명 관리 → 소멸"을 고정 크기 풀(pool)로 순환시키는 미니 파티클 시스템이다.

### 8-1. 데이터 구조 — 고정 크기 풀

```javascript
const pPos = new Float32Array(PARTICLE_MAX * 3);   // 위치
const pAlpha = new Float32Array(PARTICLE_MAX);      // 셰이더로 넘길 불투명도
const pVel = new Float32Array(PARTICLE_MAX * 3);    // 속도
const pAge = new Float32Array(PARTICLE_MAX);        // 경과 시간
const pLife = new Float32Array(PARTICLE_MAX);       // 수명 (0이면 비활성 슬롯)
```

파티클 500개(`PARTICLE_MAX`) 분량의 배열을 처음 한 번만 할당해두고 재사용한다. 파티클을 만들거나 없앨 때마다 객체를 생성/삭제하면 가비지 컬렉션 압박이 생기므로, "몇 번 슬롯이 지금 활성 상태인가"만 `pLife` 값으로 표시하는 오브젝트 풀 패턴을 쓴다.

### 8-2. 생성 — 링버퍼

```javascript
function spawnParticle(x, z) {
  const idx = nextParticle;
  nextParticle = (nextParticle + 1) % PARTICLE_MAX;
  ... // idx 슬롯에 위치/속도/수명 랜덤 값을 덮어쓴다
}
```

`nextParticle` 포인터가 0→499까지 순환하며 항상 "다음 슬롯"을 알려준다. 그 슬롯이 아직 살아있는 파티클을 담고 있어도 그냥 덮어쓴다 — 동시 생성 시도가 몰려 `PARTICLE_MAX`를 넘으면 가장 오래된 파티클부터 잘려나가는 대신, 배열 크기·인덱스 계산만으로 O(1)에 스폰이 끝나는 단순함을 택한 것이다. 스폰 위치는 꽃 중심 기준 `PARTICLE_SPAWN_RADIUS` 안의 랜덤한 원 위 점이고, 속도는 xz 방향 랜덤 드리프트 + 랜덤 상승 속도, 수명은 `PARTICLE_LIFETIME_MIN~MAX` 사이 랜덤값이다.

### 8-3. 갱신 — 물리 + 페이드 + 소멸

```javascript
function updateParticles(dt) {
  for (let k = 0; k < PARTICLE_MAX; k++) {
    if (pLife[k] <= 0) continue;          // 비활성 슬롯은 건너뜀
    pAge[k] += dt;
    if (pAge[k] >= pLife[k]) { pLife[k] = 0; alphaAttr.array[k] = 0; continue; } // 수명 종료 → 비활성화
    pPos[k*3+i] += pVel[k*3+i] * dt;       // 오일러 적분으로 위치 이동
    const lifeT = pAge[k] / pLife[k];
    alphaAttr.array[k] = Math.sin(Math.PI * lifeT); // 0→1→0 페이드
  }
  posAttr.needsUpdate = true;
  alphaAttr.needsUpdate = true;
}
```

매 프레임 500개 슬롯 전부를 순회하는 단순한 구조다(활성 개수와 무관하게 항상 고정 비용이라 예측 가능하다). 비활성 슬롯은 즉시 스킵하고, 수명을 넘긴 슬롯은 `pLife = 0`으로 되돌려 다음 `spawnParticle`이 재사용할 수 있게 한다. 살아있는 파티클은 속도만큼 위치를 전진시키고(단순 오일러 적분), `sin(π · lifeT)`로 나이(0~1 정규화)를 알파값에 매핑한다 — 시작(0)과 끝(1)에서 0, 중간(0.5)에서 최대 1이 되는 부드러운 종 모양 곡선이라 별도의 페이드인/아웃 분기 없이 한 줄로 자연스러운 명멸을 만든다. 루프가 끝난 뒤 `needsUpdate`를 딱 한 번씩 켜서 프레임당 한 번만 GPU에 버퍼를 올린다.

### 8-4. 셰이더 — 원근 보정 크기 + 원형 스프라이트 + 가산 발광

```glsl
gl_Position = projectionMatrix * mvPosition;
gl_PointSize = uSize * uPixelHeight / -mvPosition.z;
```

`gl_PointSize`를 고정값으로 두면 카메라에서 멀리 있는 파티클도 화면에서 같은 픽셀 크기로 보여 원근감이 깨진다. `-mvPosition.z`(카메라로부터의 뷰 공간 거리)로 나눠주면 거리에 반비례해 크기가 작아지는, 일반적인 원근 투영과 같은 방식으로 점 크기가 보정된다. `uPixelHeight`는 창 높이(px) 기준 스케일 계수로, 리사이즈 때 같이 갱신된다(9번 참고).

```glsl
vec2 uv = gl_PointCoord - vec2(0.5);
float circle = smoothstep(0.5, 0.0, length(uv));
if (circle <= 0.0) discard;
gl_FragColor = vec4(uColor * uStrength, circle * vAlpha);
```

점 스프라이트는 기본적으로 사각형이므로, `gl_PointCoord`(점 내부의 0~1 로컬 좌표)를 중심 기준으로 옮긴 뒤 중심으로부터의 거리에 `smoothstep`을 걸어 가장자리가 부드럽게 사라지는 원형 알파 마스크(`circle`)를 만든다. 완전히 투명한 픽셀은 `discard`로 블렌딩 계산 자체를 건너뛴다. 최종 색은 `uColor * uStrength`로 1을 넘는 밝기를 내보내 Bloom의 threshold를 통과시키고(3번 참고), `AdditiveBlending` + `depthWrite: false` 설정(재질 생성부)으로 파티클끼리 겹칠수록 더 밝아지는 가산 발광 느낌을 내면서, 깊이 버퍼를 오염시키지 않아 뒤에 그려질 다른 투명 오브젝트와의 정렬 문제를 피한다.

## 9. Resize

```javascript
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  particleMaterial.uniforms.uPixelHeight.value = window.innerHeight;
});
```

카메라의 `aspect`만 바꾸는 걸로는 부족하고, 바뀐 종횡비를 실제 투영행렬에 반영하는 `updateProjectionMatrix()`를 반드시 같이 호출해야 한다. `renderer.setSize`가 캔버스 자체의 드로잉 버퍼 크기를 맞춰도, `EffectComposer`가 내부적으로 들고 있는 렌더 타겟(오프스크린 텍스처)들은 자동으로 따라오지 않기 때문에 `composer.setSize`로 별도 리사이즈해줘야 한다 — 안 그러면 후처리 결과가 예전 해상도로 그려져 화면에 늘어나 붙는 것처럼 보인다. `UnrealBloomPass`는 블러용 내부 밉 체인 렌더 타겟을 별도로 들고 있어 `bloomPass.resolution.set(...)`으로 한 번 더 갱신해줘야 번짐 품질/위치가 새 해상도에 맞게 유지된다. 마지막으로 8번의 원근 보정 파티클 크기 계산이 창 높이를 기준으로 하고 있으므로, 그 값(`uPixelHeight`)도 함께 갱신한다.

## 10. Animate

매 프레임 실행되는 메인 루프. 크게 "마우스 좌표 갱신 → 꽃 상태 갱신 → 파티클 갱신 → 렌더" 순서로 진행된다.

```javascript
const dt = clock.getDelta();
```

`THREE.Clock.getDelta()`는 마지막 호출 이후 지난 시간(초)을 반환한다. 이후 모든 애니메이션 값(개화 속도, 파티클 이동, 스폰 확률)이 `dt`를 곱해 계산되므로, 프레임레이트가 30fps든 144fps든 같은 체감 속도로 재생된다.

### 마우스 월드 좌표 갱신

```javascript
if (pointerInside) {
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(groundPlane, mouseWorld);
} else {
  mouseWorld.set(1e6, 0, 1e6);
}
```

포인터가 화면 안에 있으면 5번에서 설명한 레이캐스팅으로 매 프레임 `mouseWorld`를 갱신한다. 포인터가 화면을 벗어나면(`pointerleave`/`touchend`) `mouseWorld`를 아주 먼 좌표(1e6)로 치워버리는데, 이렇게 하면 아래 개화도 계산에서 모든 꽃과의 거리가 자동으로 `RADIUS`를 훨씬 초과하게 되어 "커서가 없을 때" 분기를 따로 만들 필요 없이 모든 꽃이 자연스럽게 닫힌다.

### 인스턴스별 개화도 갱신

```javascript
for (let i = 0; i < FLOWER_COUNT; i++) {
  const dist = Math.hypot(basePos[i*2] - mouseWorld.x, basePos[i*2+1] - mouseWorld.z);

  const t = THREE.MathUtils.clamp(1 - dist / RADIUS, 0, 1);
  const target = t * t * (3 - 2 * t);                          // smoothstep
  openAmount[i] = THREE.MathUtils.damp(openAmount[i], target, DAMPING, dt); // 지수 감쇠 보간

  influences[0] = openAmount[i];
  for (let p = 0; p < PETALS_PER_FLOWER; p++) {
    const idx = i * PETALS_PER_FLOWER + p;
    flowers.setMorphAt(idx, morphCarrier);
    glowAttr.array[idx] = openAmount[i];
  }

  if (openAmount[i] > PARTICLE_OPEN_THRESHOLD && Math.random() < PARTICLE_SPAWN_RATE * dt) {
    spawnParticle(basePos[i*2], basePos[i*2+1]);
  }
}
flowers.morphTexture.needsUpdate = true;
glowAttr.needsUpdate = true;
```

꽃(`FLOWER_COUNT`개) 단위로 도는 이 루프가 매 프레임의 핵심이다.

1. **거리 계산**: 저장해둔 꽃의 xz 위치(`basePos`, 7번에서 채워짐)와 `mouseWorld`의 xz 사이 평면 거리(`Math.hypot`, y는 무시)를 구한다.
2. **목표 개화도(target)**: `1 - dist/RADIUS`로 "가까울수록 1, `RADIUS` 밖이면 0"인 값을 만들고 0~1로 clamp한 뒤, `smoothstep`(`t*t*(3-2t)`) 커브를 씌운다. 그냥 선형으로 두면 반경 경계에서 개화도가 뚝 끊기는 느낌이 나는데, smoothstep은 양 끝(0, 1)에서 기울기가 0이 되는 S자 곡선이라 경계가 부드럽게 이어진다.
3. **감쇠 보간**: `openAmount[i]`를 목표값으로 한 번에 점프시키지 않고, `MathUtils.damp(current, target, DAMPING, dt)`로 매 프레임 조금씩 따라가게 한다. `damp`는 내부적으로 `1 - exp(-DAMPING*dt)` 형태의 지수 감쇠를 쓰는 프레임레이트 독립적인 보간이라(단순 `lerp(current, target, 0.1)`처럼 델타타임에 좌우되지 않는다), `DAMPING` 값이 클수록 더 빨리 목표치에 수렴한다.
4. **반영**: 이렇게 구한 스칼라 하나(`openAmount[i]`)를 그 꽃에 속한 petal 6장 전부에 그대로 복사한다 — `morphCarrier.morphTargetInfluences[0]`에 담아 `setMorphAt`으로 morphTexture에, 그리고 `glowAttr.array[idx]`에 같은 값을 써서 인스턴스별 발광 attribute에 반영한다. 결국 "개화도" 하나가 지오메트리 변형(morph)과 발광 세기(emissive) 양쪽을 동시에 구동하는 셈이다.
5. **파티클 스폰 판정**: 개화도가 `PARTICLE_OPEN_THRESHOLD`를 넘은 꽃에 한해 `Math.random() < PARTICLE_SPAWN_RATE * dt` 조건으로 스폰 여부를 결정한다. `PARTICLE_SPAWN_RATE`는 "초당 생성 시도 횟수"이므로 여기에 `dt`를 곱하면 그 프레임에 스폰될 확률이 되고, 프레임레이트가 달라져도 초당 기대 생성 개수는 동일하게 유지된다.

루프가 다 돈 뒤에는 7번과 마찬가지로 `morphTexture.needsUpdate`/`glowAttr.needsUpdate`를 프레임당 한 번씩만 켜서 GPU 업로드를 배치 처리한다.

### 마무리

```javascript
updateParticles(dt);
controls.update();
composer.render();
```

8번의 파티클 풀을 갱신하고, `enableDamping`이 켜진 OrbitControls의 관성 보간을 한 스텝 진행한 뒤, 3번에서 구성한 후처리 체인(`RenderPass → UnrealBloomPass → OutputPass`)을 `composer.render()`로 실행해 화면에 최종 프레임을 낸다.
