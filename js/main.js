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

// --- Interaction State ---
const interactables = [];
const grabbedObjects = [null, null];
const prevCursorPos = [new THREE.Vector3(), new THREE.Vector3()];
let activeColor = "#00ffcc";

// --- START WITH ONLY ONE OBJECT ---
function spawnObject(type = 'knot') {
    let geo;
    if(type === 'knot') geo = new THREE.TorusKnotGeometry(3, 1, 100, 16);
    else if(type === 'sphere') geo = new THREE.IcosahedronGeometry(4);
    else geo = new THREE.BoxGeometry(4, 4, 4);

    const mat = new THREE.MeshBasicMaterial({ color: activeColor, wireframe: true, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, 0); // Start at center
    mesh.userData = { velocity: new THREE.Vector3(), held: false };
    scene.add(mesh);
    interactables.push(mesh);
}
spawnObject('knot'); // Start with just one

// --- Particle Field ---
const N = 5000; // Reduced for better real-time performance
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(N * 3);
const currentBase = new Float32Array(N * 3);
const targetBase = new Float32Array(N * 3);
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({ size: 0.4, color: activeColor, transparent: true, opacity: 0.8 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

function transitionToShape(shapeKey) {
    const data = Shapes.getShapeData(shapeKey, N);
    for(let i=0; i<N; i++) {
        targetBase[i*3] = data[i].x;
        targetBase[i*3+1] = data[i].y;
        targetBase[i*3+2] = data[i].z;
    }
}
transitionToShape('heart');

// --- Hand Tracking Fixes ---
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const cursors = [new THREE.Group(), new THREE.Group()]; // Better visual feedback
cursors.forEach(c => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide}));
    c.add(ring);
    scene.add(c);
});

const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

hands.onResults((results) => {
    // 1. DRAW THE LINES ON THE HAND
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00FFCC', lineWidth: 5});
            window.drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 2});
        }
    }
    canvasCtx.restore();

    // 2. INTERACTION LOGIC
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
            const cursor = cursors[i];
            const thumb = landmarks[4];
            const index = landmarks[8];
            
            // INCREASED PINCH SENSITIVITY (Lower value = must be closer)
            const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            const isPinching = pinchDist < 0.08; 

            // Map hand to 3D space
            const x = (index.x - 0.5) * -40;
            const y = (0.5 - index.y) * 30;
            cursor.position.set(x, y, 5);

            // Grabbing Logic
            if (isPinching) {
                cursor.children[0].scale.set(0.5, 0.5, 0.5); // Visual feedback
                if (!grabbedObjects[i]) {
                    interactables.forEach(obj => {
                        if (!obj.userData.held && cursor.position.distanceTo(obj.position) < 8) {
                            grabbedObjects[i] = obj;
                            obj.userData.held = true;
                        }
                    });
                } else {
                    grabbedObjects[i].position.lerp(cursor.position, 0.2);
                }
            } else {
                cursor.children[0].scale.set(1, 1, 1);
                if (grabbedObjects[i]) {
                    grabbedObjects[i].userData.held = false;
                    grabbedObjects[i] = null;
                }
            }
        });
    }
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

    // Smooth Particle Morphing
    const pArr = particleGeo.attributes.position.array;
    for(let i=0; i<N*3; i++) {
        currentBase[i] += (targetBase[i] - currentBase[i]) * 0.1;
        pArr[i] = currentBase[i] + Math.sin(time + i) * 0.2;
    }
    particleGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}
animate();

// UI Add Shape Button Logic
document.getElementById('addShapeBtn')?.addEventListener('click', () => spawnObject('sphere'));