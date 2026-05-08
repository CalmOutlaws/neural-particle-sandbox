import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shapes from './shapes.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Settings ---
let activeColor = "#ff007f"; // New Cyber Pink color
let tension = 1.0;

// --- ONE SINGLE OBJECT ---
const geometry = new THREE.IcosahedronGeometry(5, 1);
const material = new THREE.MeshBasicMaterial({ 
    color: activeColor, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.8 
});
const centralObject = new THREE.Mesh(geometry, material);
centralObject.userData = { held: false, velocity: new THREE.Vector3() };
scene.add(centralObject);

// --- Particle Field ---
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
    opacity: 0.6 
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Set default shape
const shapeData = Shapes.getShapeData('sphere', N);
for(let i=0; i<N; i++) {
    targetBase[i*3] = shapeData[i].x;
    targetBase[i*3+1] = shapeData[i].y;
    targetBase[i*3+2] = shapeData[i].z;
}

// --- Tracking Fixes ---
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.8, minTrackingConfidence: 0.8 });

hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Draw Skeleton
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: activeColor, lineWidth: 4});
        window.drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 1, radius: 2});

        // 1. EXPANSION LOGIC (Hand Openness)
        const tip = landmarks[8];  // Index
        const base = landmarks[0]; // Wrist
        const handSize = Math.hypot(tip.x - base.x, tip.y - base.y);
        tension = THREE.MathUtils.mapLinear(handSize, 0.2, 0.6, 1.0, 3.5); // Maps hand size to particle spread

        // 2. PINCHING LOGIC
        const thumb = landmarks[4];
        const index = landmarks[8];
        const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        
        // Map 2D hand to 3D World
        const x = (index.x - 0.5) * -50;
        const y = (0.5 - index.y) * 40;
        
        if (pinchDist < 0.07) { // Pinching
            centralObject.position.lerp(new THREE.Vector3(x, y, 0), 0.2);
            centralObject.material.color.set('#ffffff'); // Visual feedback
        } else {
            centralObject.material.color.set(activeColor);
            centralObject.position.y += Math.sin(Date.now() * 0.002) * 0.02; // Idle hover
        }
    }
    canvasCtx.restore();
});

const cameraUtils = new window.Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: 640, height: 480
});
cameraUtils.start();

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const pArr = particleGeo.attributes.position.array;

    for(let i=0; i<N*3; i++) {
        currentBase[i] += (targetBase[i] - currentBase[i]) * 0.1;
        // The Tension variable controls the "Expansion"
        pArr[i] = (currentBase[i] * tension) + Math.sin(time + i) * 0.5;
    }
    particleGeo.attributes.position.needsUpdate = true;
    centralObject.rotation.y += 0.01;

    renderer.render(scene, camera);
}
animate();

// Reset Button Logic
document.getElementById('resetBtn').onclick = () => {
    centralObject.position.set(0, 0, 0);
};