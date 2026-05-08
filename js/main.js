import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shapes from './shapes.js';

// --- 1. Scene & Camera Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- 2. State & Styling ---
let activeColor = "#ff007f"; 
let tension = 1.0;
let targetTension = 1.0;

// Central Mesh
const geometry = new THREE.IcosahedronGeometry(5, 1);
const material = new THREE.MeshBasicMaterial({ 
    color: activeColor, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.6 
});
const centralObject = new THREE.Mesh(geometry, material);
scene.add(centralObject);

// Particle System
const N = 4000; 
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(N * 3);
const currentBase = new Float32Array(N * 3);
const targetBase = new Float32Array(N * 3);
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({ 
    size: 0.3, 
    color: activeColor, 
    transparent: true, 
    opacity: 0.5,
    blending: THREE.AdditiveBlending 
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

function setTargetShape(name) {
    const shapeData = Shapes.getShapeData(name, N);
    for(let i=0; i<N; i++) {
        targetBase[i*3] = shapeData[i].x;
        targetBase[i*3+1] = shapeData[i].y;
        targetBase[i*3+2] = shapeData[i].z;
    }
}
setTargetShape('sphere');

// --- 3. Hands Tracking (Premium Calibration) ---
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ 
    maxNumHands: 2, 
    modelComplexity: 1, 
    minDetectionConfidence: 0.8, 
    minTrackingConfidence: 0.8 
});

hands.onResults((results) => {
    document.getElementById('loading').style.display = 'none';

    // FIX: Dynamic Resolution Alignment
    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Mirror the Canvas for alignment
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
            // Draw Hand Tracking Lines
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: activeColor, lineWidth: 2});
            window.drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 1, radius: 2});

            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const pinkyBase = landmarks[17];
            const indexBase = landmarks[5];

            // A. PREMIUM ROTATION (Lerped for weight)
            const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
            centralObject.rotation.z = THREE.MathUtils.lerp(centralObject.rotation.z, angle * 2, 0.05);

            // B. FLUID EXPANSION
            if(index === 0) {
                const handOpenness = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
                targetTension = THREE.MathUtils.mapLinear(handOpenness, 0.15, 0.5, 1.0, 4.5);
            }

            // C. CINEMATIC PINCH & MOVE
            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            if (pinchDist < 0.07) { 
                const tx = (indexTip.x - 0.5) * -75; // Expanded range for better mapping
                const ty = (0.5 - indexTip.y) * 55;
                // Low lerp (0.05) creates the "Premium Glide"
                centralObject.position.lerp(new THREE.Vector3(tx, ty, 0), 0.05);
                centralObject.material.opacity = THREE.MathUtils.lerp(centralObject.material.opacity, 1.0, 0.1);
            } else {
                centralObject.material.opacity = THREE.MathUtils.lerp(centralObject.material.opacity, 0.6, 0.1);
            }
        });
    }
    canvasCtx.restore();
});

const cameraUtils = new window.Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: 640, height: 480
});
cameraUtils.start();

// --- 4. Smooth Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const pArr = particleGeo.attributes.position.array;

    // Smoothly transition tension
    tension = THREE.MathUtils.lerp(tension, targetTension, 0.05);

    for(let i=0; i<N*3; i++) {
        currentBase[i] += (targetBase[i] - currentBase[i]) * 0.08;
        pArr[i] = (currentBase[i] * tension) + Math.sin(time + i * 0.5) * 0.25;
    }
    particleGeo.attributes.position.needsUpdate = true;
    
    // Slow ambient rotation for a "gallery" feel
    centralObject.rotation.y += 0.003;
    particles.rotation.y += 0.001;

    renderer.render(scene, camera);
}
animate();

// --- 5. Interaction Hooks ---
document.getElementById('resetBtn').onclick = () => {
    centralObject.position.set(0, 0, 0);
};

document.getElementById('shapeSphere').onclick = () => setTargetShape('sphere');
document.getElementById('shapeHeart').onclick = () => setTargetShape('heart');

document.getElementById('colorPicker').addEventListener('input', (e) => {
    activeColor = e.target.value;
    centralObject.material.color.set(activeColor);
    particleMat.color.set(activeColor);
    document.querySelector('.badge').style.background = activeColor;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});