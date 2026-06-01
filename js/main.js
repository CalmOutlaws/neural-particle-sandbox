import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shapes from './shapes.js';
import * as CANNON from 'cannon-es';

/** * DEVICE OPTIMIZATION, SMOOTHING & AUDIO STATE */
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let vertexCount = isMobile ? 1500 : 4000; // Changed to let to allow performance mode reassignment

const posSmoothing = 0.08;
const rotSmoothing = 0.05;

let activeColor = "#ff007f";
let targetTension = 1.0;
let currentTension = 1.0;

let targetPosition = new THREE.Vector3(0, 0, 0);
let handVelocity = 0;
let lastHandPos = new THREE.Vector2(0.5, 0.5);

let targetZRotation = 0;

// Interactive Matrix Elements - BOOT ACTIVE BY DEFAULT
let shieldMesh = null;
let shieldActive = true;

// Web Audio API Elements
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let audioEnabled = false;

// Physics Engine Elements
let physicsWorld = null;
let physicsBodies = [];
let physicsEnabled = false;

// Gesture Recording & Playback States
let isRecording = false;
let recordedGestures = [];
let playbackIndex = 0;
let isPlayingBack = false;
let playbackStartTime = null; // FIXED: Defined globally to prevent runtime reference errors

// Performance Telemetry
let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

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

// --- 2. Single Core Particle Engine ---
let coreGeo = new THREE.BufferGeometry();
let positions = new Float32Array(vertexCount * 3);
let currentBase = new Float32Array(vertexCount * 3);
let targetBase = new Float32Array(vertexCount * 3);
coreGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const defaultPointSize = isMobile ? 0.35 : 0.22;
const coreMat = new THREE.PointsMaterial({ 
    size: defaultPointSize, 
    color: activeColor, 
    transparent: true, 
    opacity: 0.85,
    blending: THREE.AdditiveBlending 
});

const centralObject = new THREE.Points(coreGeo, coreMat);
scene.add(centralObject);

function setTargetShape(name) {
    const data = Shapes.getShapeData(name, vertexCount);
    for(let i = 0; i < vertexCount; i++) {
        if (data[i]) {
            targetBase[i * 3]     = data[i].x;
            targetBase[i * 3 + 1] = data[i].y;
            targetBase[i * 3 + 2] = data[i].z;
        }
    }
    const statElement = document.getElementById('stat-vertices');
    if (statElement) statElement.innerText = vertexCount.toLocaleString();
}
setTargetShape('sphere');

// --- 3. Holo Wireframe Shield (Constructed Active on Initialization) ---
function createShieldMesh() {
    if (shieldMesh) scene.remove(shieldMesh);
    const shieldGeo = new THREE.IcosahedronGeometry(6.5, isMobile ? 1 : 2);
    const shieldMat = new THREE.MeshBasicMaterial({
        color: activeColor,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
    });
    shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    scene.add(shieldMesh);
}
createShieldMesh(); 

// --- 4. Web Audio Initializer ---
function initAudioEngine() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}

// --- 4b. Physics Engine Initializer ---
function initPhysicsEngine() {
    if (physicsWorld) return;

    physicsWorld = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0),
        broadphase: new CANNON.NaiveBroadphase(),
        solver: new CANNON.GSSolver()
    });

    physicsWorld.defaultContactMaterial.friction = 0.1;
    physicsWorld.defaultContactMaterial.restitution = 0.3;

    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
    physicsWorld.addBody(groundBody);

    const particleRadius = 0.1;
    const particleMass = 0.01;

    physicsBodies = [];
    for (let i = 0; i < Math.min(vertexCount, 500); i++) {
        const sphereBody = new CANNON.Body({
            mass: particleMass,
            shape: new CANNON.Sphere(particleRadius),
            position: new CANNON.Vec3(
                (Math.random() - 0.5) * 10,
                5 + Math.random() * 10,
                (Math.random() - 0.5) * 10
            ),
            velocity: new CANNON.Vec3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            )
        });
        physicsWorld.addBody(sphereBody);
        physicsBodies.push(sphereBody);
    }
}

// --- 4c. Core Geometry Recreator ---
function recreateCoreGeometry() {
    centralObject.geometry.dispose();

    coreGeo = new THREE.BufferGeometry();
    positions = new Float32Array(vertexCount * 3);
    currentBase = new Float32Array(vertexCount * 3);
    targetBase = new Float32Array(vertexCount * 3);
    coreGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    centralObject.geometry = coreGeo;

    for(let i = 0; i < vertexCount * 3; i++) {
        currentBase[i] = 0;
        targetBase[i] = 0;
    }

    setTargetShape(document.getElementById('shapeSelector').value);
}

// --- 5. Hand Tracking Subsystems ---
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new window.Hands({ 
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
});

hands.setOptions({ 
    maxNumHands: 1, 
    modelComplexity: isMobile ? 0 : 1, 
    minDetectionConfidence: 0.75, 
    minTrackingConfidence: 0.75 
});

hands.onResults((results) => {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';

    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        controls.enabled = false; 

        results.multiHandLandmarks.forEach((landmarks, index) => {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: activeColor, lineWidth: 2});
            
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const pinkyBase = landmarks[17];
            const indexBase = landmarks[5];

            const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
            targetZRotation = -angle; 

            if(index === 0) {
                const openness = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
                targetTension = THREE.MathUtils.mapLinear(openness, 0.15, 0.5, 1.0, 4.2);
                
                const currentPos = new THREE.Vector2(indexTip.x, indexTip.y);
                const frameDist = currentPos.distanceTo(lastHandPos);
                handVelocity = THREE.MathUtils.lerp(handVelocity, frameDist * 15.0, 0.1);
                lastHandPos.copy(currentPos);

                if (audioEnabled && audioCtx) {
                    const targetFreq = THREE.MathUtils.mapLinear(openness, 0.15, 0.5, 90, 280);
                    const targetVolume = THREE.MathUtils.mapLinear(handVelocity, 0, 5, 0.05, 0.22);
                    oscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
                    gainNode.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.1);
                    document.getElementById('stat-audio').innerText = `${Math.round(targetFreq)} Hz`;
                }
            }

            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            if (pinchDist < 0.08) { 
                const tx = (0.5 - indexTip.x) * 75; 
                const ty = (0.5 - indexTip.y) * 55;
                targetPosition.set(tx, ty, 0);
            }
        });
    } else {
        if (!isPlayingBack) {
            controls.enabled = true;
            targetTension = 1.0; 
            handVelocity = THREE.MathUtils.lerp(handVelocity, 0, 0.05);
            if (audioEnabled && audioCtx) {
                gainNode.gain.setTargetAtTime(0.02, audioCtx.currentTime, 0.2); 
                document.getElementById('stat-audio').innerText = "IDLE HUM";
            }
        }
    }
    canvasCtx.restore();
});

const cameraUtils = new window.Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: isMobile ? 480 : 640,
    height: isMobile ? 360 : 480
});
cameraUtils.start();

// --- 6. Clean Render Loop Engine (FIXED: Duplications Removed) ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const pArr = coreGeo.attributes.position.array;

    // Telemetry and FPS Calculations
    frameCount++;
    if (performance.now() >= lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (performance.now() - lastTime));
        document.getElementById('fps-counter').innerText = `${fps} FPS`;
        frameCount = 0;
        lastTime = performance.now();
    }
    document.getElementById('stat-velocity').innerText = handVelocity.toFixed(2);

    // Track gesture recording pipelines
    if (isRecording) {
        recordedGestures.push({
            position: targetPosition.clone(),
            rotation: targetZRotation,
            tension: targetTension,
            handVelocity: handVelocity
        });
        if (recordedGestures.length > 1000) recordedGestures.shift();
    }

    // Playback loop controller tracking variables
    if (isPlayingBack && recordedGestures.length > 0) {
        const now = performance.now();
        if (!playbackStartTime) playbackStartTime = now;

        const elapsed = now - playbackStartTime;
        const gestureIndex = Math.min(
            Math.floor((elapsed / 10) % recordedGestures.length),
            recordedGestures.length - 1
        );

        const gesture = recordedGestures[gestureIndex];
        if (gesture) {
            targetPosition.copy(gesture.position);
            targetZRotation = gesture.rotation;
            targetTension = gesture.tension;
            handVelocity = gesture.handVelocity;
        }
    }

    // Physics transformation matrix update pipelines
    if (physicsEnabled && physicsWorld) {
        physicsWorld.step(1/60);
        for (let i = 0; i < Math.min(physicsBodies.length, vertexCount); i++) {
            const body = physicsBodies[i];
            pArr[i * 3] = body.position.x;
            pArr[i * 3 + 1] = body.position.y;
            pArr[i * 3 + 2] = body.position.z;
        }
        coreGeo.attributes.position.needsUpdate = true;
    } else {
        // Core Mathematical Form Transition Interpolations
        centralObject.position.lerp(targetPosition, posSmoothing);
        
        let diff = targetZRotation - centralObject.rotation.z;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); 
        centralObject.rotation.z += diff * rotSmoothing;

        currentTension = THREE.MathUtils.lerp(currentTension, targetTension, 0.06);

        const targetPointSize = defaultPointSize + (handVelocity * 0.04);
        coreMat.size = THREE.MathUtils.lerp(coreMat.size, targetPointSize, 0.1);

        const dynamicWaveRipple = 0.10 + (handVelocity * 0.04);
        const waveFrequency = 0.2 + (handVelocity * 0.06);

        for(let i = 0; i < vertexCount * 3; i++) {
            currentBase[i] += (targetBase[i] - currentBase[i]) * 0.08;
            pArr[i] = (currentBase[i] * currentTension) + Math.sin(time * waveFrequency + i * 0.4) * dynamicWaveRipple;
        }
        coreGeo.attributes.position.needsUpdate = true;
    }

    // Ambient Idling Rotations
    centralObject.rotation.y += 0.001 + (handVelocity * 0.001);
    centralObject.rotation.x += 0.0005;
    
    if (shieldActive && shieldMesh) {
        shieldMesh.position.copy(centralObject.position);
        shieldMesh.rotation.z = centralObject.rotation.z;
        shieldMesh.rotation.y += 0.004; 
        shieldMesh.scale.setScalar(currentTension * 1.4);
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- 7. UI Interaction Interfaces ---
document.getElementById('shieldToggleBtn').onclick = (e) => {
    shieldActive = !shieldActive;
    if (shieldActive) {
        createShieldMesh();
        e.target.innerText = "Collapse Shield";
        e.target.style.background = "#ff007f";
    } else {
        if (shieldMesh) {
            scene.remove(shieldMesh);
            shieldMesh = null;
        }
        e.target.innerText = "Deploy Hologram Shield";
        e.target.style.background = "#2e2e2e";
    }
};

document.getElementById('audioToggleBtn').onclick = (e) => {
    initAudioEngine();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
        e.target.innerText = "Disable Audio Engine";
        e.target.style.background = "#ff007f";
        document.getElementById('stat-audio').innerText = "LIVE ACTIVE";
    } else {
        e.target.innerText = "Enable Audio Engine";
        e.target.style.background = "#2e2e2e";
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        document.getElementById('stat-audio').innerText = "MUTED";
    }
};

document.getElementById('colorPicker').addEventListener('input', (e) => {
    activeColor = e.target.value;
    centralObject.material.color.set(activeColor);
    if(shieldMesh) shieldMesh.material.color.set(activeColor);
    const badge = document.querySelector('.badge');
    if (badge) badge.style.background = activeColor;
});

document.getElementById('resetBtn').onclick = () => {
    targetPosition.set(0, 0, 0);
    targetZRotation = 0;
    centralObject.rotation.set(0, 0, 0);
};

document.getElementById('physicsToggleBtn').onclick = (e) => {
    physicsEnabled = !physicsEnabled;
    if (physicsEnabled) {
        initPhysicsEngine();
        e.target.innerText = "Physics: ON";
        e.target.style.background = "#ff007f";
        document.getElementById('stat-physics').innerText = "ACTIVE";
    } else {
        physicsEnabled = false;
        physicsWorld = null; // Kill world reference to pull particles back to base shapes
        e.target.innerText = "Physics: OFF";
        e.target.style.background = "#2e2e2e";
        document.getElementById('stat-physics').innerText = "INACTIVE";
    }
};

document.getElementById('recordBtn').onclick = (e) => {
    isRecording = !isRecording;
    if (isRecording) {
        recordedGestures = [];
        e.target.innerText = "Recording...";
        e.target.style.background = "#ff007f";
    } else {
        e.target.innerText = "Record Gesture";
        e.target.style.background = "#2e2e2e";
        alert(`Recorded ${recordedGestures.length} gesture points`);
    }
};

document.getElementById('playbackBtn').onclick = (e) => {
    if (recordedGestures.length === 0) {
        alert("No gestures recorded yet!");
        return;
    }
    isPlayingBack = !isPlayingBack;
    if (isPlayingBack) {
        playbackStartTime = null;
        e.target.innerText = "Stop Playback";
        e.target.style.background = "#ff007f";
    } else {
        e.target.innerText = "Playback";
        e.target.style.background = "#2e2e2e";
    }
};

document.getElementById('exportBtn').onclick = () => {
    const data = {
        settings: {
            vertexCount: vertexCount,
            activeColor: activeColor,
            shieldActive: shieldActive
        },
        gestures: recordedGestures
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "neural-particle-simulation.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

document.getElementById('performanceSelect').addEventListener('change', (e) => {
    const mode = e.target.value;
    switch(mode) {
        case 'ultra': vertexCount = 8000; break;
        case 'high':  vertexCount = isMobile ? 1500 : 4000; break;
        case 'medium': vertexCount = isMobile ? 800 : 2000; break;
        case 'low':    vertexCount = isMobile ? 400 : 1000; break;
        case 'mobile': vertexCount = 800; break;
    }
    recreateCoreGeometry();
});

document.getElementById('shapeSelector').addEventListener('change', (e) => {
    setTargetShape(e.target.value);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});