import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

class App {
  constructor() {
    this._setupRenderer();
    this._setupCamera();
    this._setupScene();
    this._setupLight();
    this._setupControls();
    this._setupModel();
    this._setupEvent();
  }

  _setupRenderer() {
    const container = document.querySelector("#webgl-container");
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    this._renderer = renderer;
  }

  _setupCamera() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(8, 3, 8);
    this._camera = camera;
  }

  _setupScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9a9a9a");
    scene.fog = new THREE.Fog("#9a9a9a", 2, 20);
    this._scene = scene;
  }

  _setupLight() {
    const ambient = new THREE.AmbientLight("#ff00ff", 0.4);
    this._scene.add(ambient);

    const mainLight = new THREE.DirectionalLight("#66ffff", 1.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this._scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight("#d78f3d", 0.5);
    fillLight.position.set(-3, 2, -3);
    this._scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight("#f52727", 0.6);
    rimLight.position.set(0, -2, -5);
    this._scene.add(rimLight);
  }

  _setupControls() {
    const controls = new OrbitControls(this._camera, this._renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    this._controls = controls;
  }

  _setupModel() {
    const group = new THREE.Group();

    // 메인 구체 재질
    const mainSphereMat = new THREE.MeshStandardMaterial({
      color: "#c8dcd6",
      roughness: 0.6,
      metalness: 0.2,
      envMapIntensity: 1.5,
    });

    // 금속 연결선 재질
    const lineMat = new THREE.MeshStandardMaterial({
      color: "#d4a574",
      roughness: 0.3,
      metalness: 1.0,
    });

    // 작은 입자 재질
    const particleMat = new THREE.MeshStandardMaterial({
      color: "#dcb683",
      roughness: 0.4,
      metalness: 0.8,
    });

    // 나선형 구조 생성
    const turns = 4; // 나선 회전 수
    const pointsPerTurn = 40;
    const totalPoints = turns * pointsPerTurn;
    const radius = 1.5;
    const height = 8;

    const spheres = [];
    const lines = [];

    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;

      // 크기가 점진적으로 증가
      const sizeScale = 0.2 + t * 0.3;
      const size = 0.1 + sizeScale * 0.2;

      // 첫 번째 나선
      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;

      const geo1 = new THREE.SphereGeometry(size, 32, 32);
      const sphere1 = new THREE.Mesh(geo1, mainSphereMat.clone());
      sphere1.position.set(x1, y, z1);
      sphere1.castShadow = true;
      sphere1.receiveShadow = true;
      group.add(sphere1);
      spheres.push(sphere1);

      // 두 번째 나선 (반대편)
      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;

      const geo2 = new THREE.SphereGeometry(size, 32, 32);
      const sphere2 = new THREE.Mesh(geo2, mainSphereMat.clone());
      sphere2.position.set(x2, y, z2);
      sphere2.castShadow = true;
      sphere2.receiveShadow = true;
      group.add(sphere2);
      spheres.push(sphere2);

      // 두 나선을 연결하는 라인
      if (i % 3 === 0) {
        const points = [];
        points.push(new THREE.Vector3(x1, y, z1));
        points.push(new THREE.Vector3(x2, y, z2));

        const lineGeo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          2,
          0.015,
          8,
          false,
        );
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        lineMesh.castShadow = true;
        group.add(lineMesh);
        lines.push(lineMesh);
      }

      // 연결 노드 (중간 작은 구체)
      if (i > 0 && i % 2 === 0) {
        const prevSphere = spheres[spheres.length - 3];
        const midPoint = new THREE.Vector3()
          .addVectors(sphere1.position, prevSphere.position)
          .multiplyScalar(0.5);

        const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const nodeMesh = new THREE.Mesh(nodeGeo, particleMat);
        nodeMesh.position.copy(midPoint);
        nodeMesh.castShadow = true;
        group.add(nodeMesh);
      }
    }

    // 나선 주변 떠다니는 작은 입자들
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const distance = radius + 0.5 + Math.random() * 2;
      const y = (t - 0.5) * height * 1.2;

      const size = 0.02 + Math.random() * 0.08;
      const particleGeo = new THREE.SphereGeometry(size, 32, 32);
      const particle = new THREE.Mesh(particleGeo, particleMat.clone());

      particle.position.set(
        Math.cos(angle) * distance,
        y,
        Math.sin(angle) * distance,
      );

      particle.userData.offset = Math.random() * Math.PI * 2;
      particle.userData.speed = 0.2 + Math.random() * 0.3;

      group.add(particle);
    }

    this._scene.add(group);
    this._group = group;
  }

  _setupEvent() {
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.0005;

    // 그룹 전체 회전
    this._group.rotation.y = time * 0.3;

    // 작은 입자들 움직임
    this._group.children.forEach((child) => {
      if (child.userData.offset !== undefined) {
        const offset = child.userData.offset;
        const speed = child.userData.speed;
        child.position.y += Math.sin(time * speed + offset) * 0.002;
      }
    });

    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.animate();
});
