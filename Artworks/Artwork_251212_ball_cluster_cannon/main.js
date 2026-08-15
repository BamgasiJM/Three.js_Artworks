import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

// ----- 기본 THREE 세팅 -----
const scene = new THREE.Scene();
scene.background = new THREE.Color("#222130");

const camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	100
);
camera.position.set(4, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ----- CANNON 물리 월드 -----
const world = new CANNON.World({
	gravity: new CANNON.Vec3(0, 0, 0),
});

world.broadphase = new CANNON.SAPBroadphase(world);
world.solver.iterations = 10;

// ----- 오브젝트 생성 -----
const objects = [];
const bodies = [];

for (let i = 0; i < 400; i++) {
	const isSphere = Math.random() > 0.5;

	const h = Math.random();
	const material = new THREE.MeshStandardMaterial({
		color: new THREE.Color().setHSL(h, 0.6, 0.6),
		roughness: 0.1,
		metalness: 0.1,
	});

	let mesh, shape;

	if (isSphere) {
		mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), material);
		shape = new CANNON.Sphere(0.25);
	} else {
		mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), material);
		shape = new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.2));
	}

	mesh.position.set(
		(Math.random() - 0.5) * 3,
		(Math.random() - 0.5) * 3,
		(Math.random() - 0.5) * 3
	);
	scene.add(mesh);

	const body = new CANNON.Body({
		mass: 1,
		shape,
		position: new CANNON.Vec3(
			mesh.position.x,
			mesh.position.y,
			mesh.position.z
		),
		linearDamping: 0.15,
		angularDamping: 0.2,
	});

	world.addBody(body);

	objects.push(mesh);
	bodies.push(body);
}

// ----- 라이트 -----
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ----- 중앙으로 모으는 힘 -----
function attractToCenter() {
	bodies.forEach((b) => {
		const dir = new CANNON.Vec3(-b.position.x, -b.position.y, -b.position.z);
		dir.scale(2.5, dir);
		b.applyForce(dir, b.position);
	});
}

// ----- 폭발 -----
function explode() {
	bodies.forEach((b) => {
		const randomDir = new CANNON.Vec3(
			(Math.random() - 0.5) * 60,
			(Math.random() - 0.5) * 60,
			(Math.random() - 0.5) * 60
		);
		b.velocity.set(randomDir.x, randomDir.y, randomDir.z);
	});
}

window.addEventListener("pointerdown", explode);

// ----- 애니메이션 루프 -----
function animate() {
	requestAnimationFrame(animate);

	attractToCenter();
	world.step(1 / 60);

	for (let i = 0; i < objects.length; i++) {
		objects[i].position.copy(bodies[i].position);
		objects[i].quaternion.copy(bodies[i].quaternion);
	}

	controls.update();
	renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
