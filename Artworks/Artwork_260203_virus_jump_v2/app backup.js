import * as THREE from "three";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4682b4);
scene.fog = new THREE.Fog(0x666666, 0.01, 3.4);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 3, 1);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("three-canvas"),
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(5, 5, 2);
directionalLight.castShadow = true;
scene.add(directionalLight);

// --- Group for big sphere and cones ---
const sphereAndConeGroup = new THREE.Group();

// Big sphere
const sphereRadius = 3.05;
const bigGeometry = new THREE.IcosahedronGeometry(sphereRadius, 3);
const bigMaterial = new THREE.MeshStandardMaterial({
  color: 0x00a86b,
  flatShading: true,
});
const bigSphere = new THREE.Mesh(bigGeometry, bigMaterial);
bigSphere.castShadow = true;
bigSphere.receiveShadow = true;
sphereAndConeGroup.add(bigSphere);

// Create 100 cones attached to the sphere's surface
const numberOfCones = 1000;
for (let i = 0; i < numberOfCones; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const direction = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );

  const coneRadius = Math.random() * 0.1 + 0.05;
  const coneHeight = Math.random() * 0.25 + 0.1;
  const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 12);
  const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff6347 });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.castShadow = true;
  cone.receiveShadow = true;

  // Place cone on the sphere's surface
  cone.position.copy(direction.clone().multiplyScalar(sphereRadius));
  // Orient the cone to point away from the center
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  sphereAndConeGroup.add(cone);
}

scene.add(sphereAndConeGroup);

// Small white sphere
const smallGeometry = new THREE.IcosahedronGeometry(0.06, 1);
const smallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  flatShading: true,
});
const smallSphere = new THREE.Mesh(smallGeometry, smallMaterial);
smallSphere.position.set(0, 3.06, 0);
smallSphere.castShadow = true;
smallSphere.receiveShadow = true;
scene.add(smallSphere);

// Camera is fixed
function updateCamera() {
  camera.position.set(0, 3.6, 1);
  camera.lookAt(0, 3, -0.7);
}

// Rotation functions
let rotationSpeed = 0.003;
function rotateBigSphere() {
  sphereAndConeGroup.rotation.x += rotationSpeed;
  sphereAndConeGroup.rotation.y += rotationSpeed / 2;
  sphereAndConeGroup.rotation.z += rotationSpeed / 3;
}
function rotateSmallSphere() {
  smallSphere.rotation.x += rotationSpeed * -20;
  smallSphere.rotation.y += rotationSpeed * -5;
  smallSphere.rotation.z += rotationSpeed * -5;
}

// Jumping action
let isJumping = false;
const jumpHeight = 0.3;
const jumpSpeed = 0.015;
let jumpStartPosition = smallSphere.position.y;
window.addEventListener("keydown", (event) => {
  if (event.key === " " && !isJumping) {
    isJumping = true;
    let jumpHeightReached = false;
    function jumpAnimation() {
      if (isJumping) {
        if (!jumpHeightReached) {
          smallSphere.position.y += jumpSpeed;
          if (smallSphere.position.y >= jumpStartPosition + jumpHeight) {
            jumpHeightReached = true;
          }
        } else {
          smallSphere.position.y -= jumpSpeed;
          if (smallSphere.position.y <= jumpStartPosition) {
            smallSphere.position.y = jumpStartPosition;
            isJumping = false;
          }
        }
      }
    }
    function jumpLoop() {
      if (isJumping) {
        jumpAnimation();
        requestAnimationFrame(jumpLoop);
      }
    }
    jumpLoop();
  }
});

// Collision detection: if small sphere collides with any cone, change its color
let collisionCooldown = false;
function checkCollision() {
  // Iterate over children of sphereAndConeGroup and check cones (skip bigSphere)
  sphereAndConeGroup.children.forEach((child) => {
    if (child !== bigSphere) {
      const coneWorldPos = new THREE.Vector3();
      child.getWorldPosition(coneWorldPos);
      const distance = smallSphere.position.distanceTo(coneWorldPos);
      // 임계값: 0.12 (조정 가능)
      if (distance < 0.1 && !collisionCooldown) {
        collisionCooldown = true;
        const originalColor = smallSphere.material.color.getHex();
        smallSphere.material.color.set(0x1163aa); // tomato color (same as cones)
        setTimeout(() => {
          smallSphere.material.color.set(originalColor);
          collisionCooldown = false;
        }, 100);
      }
    }
  });
}

// Render loop
function animate() {
  requestAnimationFrame(animate);

  rotateBigSphere();
  rotateSmallSphere();
  updateCamera();
  checkCollision(); // Check for collisions each frame
  renderer.render(scene, camera);
}

animate();
