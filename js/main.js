import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shapes from './shapes.js';

/** 
 * DEVICE OPTIMIZATION
 * Detect mobile to reduce CPU load and adjust camera resolution.
 */
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const particleCount = isMobile ? 1800 : 4000;
const lerpSpeed = 0.06; // The "Premium" smoothness factor

// --- 1. Scene Setup ---
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

// --- 2. Visual Elements ---
let activeColor = "#ff007f"; 
let targetTension = 1.0;
let currentTension = 1.0;

// Central Object
const geometry = new THREE.IcosahedronGeometry(5, 1);
const material = new THREE.MeshBasicMaterial({ 
    color: activeColor, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.6 
});
const centralObject = new THREE.Mesh(geometry, material);
scene.add(centralObject);

// Particles
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const currentBase = new Float32Array(particleCount * 3);
const targetBase = new Float32Array(particleCount * 3);
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({ 
    size: isMobile ? 0.4 : 0.25, 
    color: activeColor, 
    transparent: true, 
    opacity: 0.5,
    blending: THREE.AdditiveBlending 
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

function setTargetShape(name) {
    const data = Shapes.getShapeData(name, particleCount);
    for(let i=0; i<particleCount; i++) {
        targetBase[i*3] = data[i].x;
        targetBase[i*3+1] = data[i].y;
        targetBase[i*3+2] = data[i].z;
    }
}
setTargetShape('sphere');

// --- 3. Hand Tracking Implementation ---
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new window.Hands({ 
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
});

hands.setOptions({ 
    maxNumHands: 2, 
    modelComplexity: isMobile ? 0 : 1, // Use simpler model on mobile
    minDetectionConfidence: 0.7, 
    minTrackingConfidence: 0.7 
});

hands.onResults((results) => {
    document.getElementById('loading').style.display = 'none';

    // Auto-sync canvas resolution to video stream for perfect line alignment
    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Mirror drawing
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Disable orbit controls while interacting to prevent camera jumping
        controls.enabled = false;

        results.multiHandLandmarks.forEach((landmarks, index) => {
            // Visual Tracking Lines
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: activeColor, lineWidth: 2});
            
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const pinkyBase = landmarks[17];
            const indexBase = landmarks[5];

            // Rotation (Lerped for smooth "steering" feel)
            const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
            centralObject.rotation.z = THREE.MathUtils.lerp(centralObject.rotation.z, angle * 2, lerpSpeed);

            // Pulse/Expansion (Hand 0)
            if(index === 0) {
                const openness = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
                targetTension = THREE.MathUtils.mapLinear(openness, 0.15, 0.5, 1.0, 4.0);
            }

            // Cinematic Drag/Pinch
            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            if (pinchDist < 0.08) { 
                const tx = (indexTip.x - 0.5) * -70; 
                const ty = (0.5 - indexTip.y) * 50;
                centralObject.position.lerp(new THREE.Vector3(tx, ty, 0), lerpSpeed);
                centralObject.material.opacity = THREE.MathUtils.lerp(centralObject.material.opacity, 1.0, 0.1);
            } else {
                centralObject.material.opacity = THREE.MathUtils.lerp(centralObject.material.opacity, 0.6, 0.1);
            }
        });
    } else {
        controls.enabled = true;
    }
    canvasCtx.restore();
});

const cameraUtils = new window.Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: isMobile ? 480 : 640,
    height: isMobile ? 360 : 480
});
cameraUtils.start();

// --- 4. Render Engine ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const pArr = particleGeo.attributes.position.array;

    // Smooth Tension Morph
    currentTension = THREE.MathUtils.lerp(currentTension, targetTension, 0.05);

    for(let i=0; i<particleCount * 3; i++) {
        currentBase[i] += (targetBase[i] - currentBase[i]) * 0.08;
        pArr[i] = (currentBase[i] * currentTension) + Math.sin(time + i * 0.4) * 0.2;
    }
    particleGeo.attributes.position.needsUpdate = true;
    
    centralObject.rotation.y += 0.005;
    particles.rotation.y += 0.001;

    renderer.render(scene, camera);
}
animate();

// --- 5. UI Events ---
document.getElementById('colorPicker').addEventListener('input', (e) => {
    activeColor = e.target.value;
    centralObject.material.color.set(activeColor);
    particleMat.color.set(activeColor);
    document.querySelector('.badge').style.background = activeColor;
});

document.getElementById('resetBtn').onclick = () => centralObject.position.set(0, 0, 0);
document.getElementById('shapeSphere').onclick = () => setTargetShape('sphere');
document.getElementById('shapeHeart').onclick = () => setTargetShape('heart');

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});