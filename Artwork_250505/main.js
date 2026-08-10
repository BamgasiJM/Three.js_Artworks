// Scene, camera, and renderer setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x252525); 

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Create undulating sphere geometry
const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);

// Create material with blue-purple gradient
const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const fragmentShader = `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Create a gradient based on the y position
                float gradientFactor = (vPosition.y + 1.0) * 0.5;
                
                // Blue-purple gradient
                vec3 blue = vec3(0.0, 0.05, 0.8);
                vec3 purple = vec3(0.5, 0.0, 0.5);
                vec3 baseColor = mix(blue, purple, gradientFactor);
                
                // Simulate metallic reflection
                vec3 light = normalize(vec3(0.0, 1.0, 1.0));
                float specular = pow(max(dot(normalize(vNormal), light), 0.0), 30.0);
                
                // Calculate Fresnel effect for metallic look
                float fresnelFactor = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
                
                // Final color with metallic effect
                vec3 finalColor = baseColor + specular * 0.5 + fresnelFactor * 0.3;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

const sphereMaterial = new THREE.ShaderMaterial({
	vertexShader: vertexShader,
	fragmentShader: fragmentShader,
	uniforms: {},
});

// Create mesh
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Add area light from above
const areaLight = new THREE.RectAreaLight(0xffffff, 5, 3, 3);
areaLight.position.set(0, 3, 0);
areaLight.lookAt(0, 0, 0);
scene.add(areaLight);

// Add ambient light for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Original sphere vertices for wave calculation
const originalPositions = sphereGeometry.attributes.position.array.slice();

// Animation loop
function animate() {
	requestAnimationFrame(animate);

	// Update sphere vertices for wave effect
	const time = Date.now() * 0.001;
	const positions = sphereGeometry.attributes.position.array;

	for (let i = 0; i < positions.length; i += 3) {
		const x = originalPositions[i];
		const y = originalPositions[i + 1];
		const z = originalPositions[i + 2];

		// Calculate distance from center
		const distance = Math.sqrt(x * x + y * y + z * z);

		// Create wave effect
		const waveX = Math.sin(x * 8 + time) * 0.05;
		const waveY = Math.sin(y * 8 + time) * 0.05;
		const waveZ = Math.sin(z * 8 + time) * 0.05;

		positions[i] = x + (x / distance) * waveX;
		positions[i + 1] = y + (y / distance) * waveY;
		positions[i + 2] = z + (z / distance) * waveZ;
	}

	// Mark vertices for update
	sphereGeometry.attributes.position.needsUpdate = true;
	sphereGeometry.computeVertexNormals();

	// Rotate sphere slightly
	sphere.rotation.y += 0.005;

	renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener("resize", () => {
	const size = Math.min(window.innerWidth, window.innerHeight);
	renderer.setSize(size, size);
	camera.aspect = 1;
	camera.updateProjectionMatrix();
});

// Initial resize
const size = Math.min(window.innerWidth, window.innerHeight);
renderer.setSize(size, size);
