let scene, camera, renderer, sphere;
let video, videoCanvas, videoContext;
let brightnessValue = 0;

async function initWebcam() {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { width: 320, height: 240 },
		});

		video = document.createElement("video");
		video.srcObject = stream;
		video.play();

		videoCanvas = document.getElementById("videoCanvas");
		videoCanvas.width = 320;
		videoCanvas.height = 240;
		videoContext = videoCanvas.getContext("2d");

		document.getElementById("info").innerHTML =
			'밝기: <span id="brightness">0</span>%<br>구 크기: <span id="size">0</span>';

		return true;
	} catch (err) {
		document.getElementById("info").innerHTML =
			"웹캠 접근 실패: " + err.message;
		return false;
	}
}

function analyzeVideoFrame() {
	if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return 0;

	videoContext.drawImage(video, 0, 0, 320, 240);
	const imageData = videoContext.getImageData(0, 0, 320, 240);
	const data = imageData.data;

	let totalBrightness = 0;
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		totalBrightness += (r + g + b) / 3;
	}

	const avgBrightness = totalBrightness / (320 * 240);
	return avgBrightness / 255; // 0~1 사이 값으로 정규화
}

function initThree() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.z = 5;

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// 스피어 생성
	const geometry = new THREE.SphereGeometry(1, 32, 32);
	const material = new THREE.MeshStandardMaterial({
		color: 0x00ffff,
		wireframe: false,
	});

	sphere = new THREE.Mesh(geometry, material);
	scene.add(sphere);

	// 조명 추가 (선택사항)
	const ambientLight = new THREE.AmbientLight(0x404040);
	scene.add(ambientLight);
}

function animate() {
	requestAnimationFrame(animate);

	// 웹캠 분석
	brightnessValue = analyzeVideoFrame();

	// UI 업데이트
	const brightElem = document.getElementById("brightness");
	const sizeElem = document.getElementById("size");
	if (brightElem) {
		brightElem.textContent = (brightnessValue * 100).toFixed(1);
	}

	// 밝기에 따라 구 크기 변화
	if (sphere) {
		// 밝기 0(검은색) = 크기 0, 밝기 1(흰색) = 크기 5
		const targetScale = brightnessValue * 5;
		sphere.scale.set(targetScale, targetScale, targetScale);

		if (sizeElem) {
			sizeElem.textContent = targetScale.toFixed(2);
		}

		// 부드러운 회전 효과
		sphere.rotation.x += 0.01;
		sphere.rotation.y += 0.01;
	}

	renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// 초기화
async function init() {
	const webcamOk = await initWebcam();
	if (webcamOk) {
		initThree();
		animate();
	}
}

init();
