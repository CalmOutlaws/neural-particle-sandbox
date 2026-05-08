import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Shapes from './shapes.js';

/**
 * 1. SCENE ENGINE SETUP
 */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0f12, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/**
 * 2. INTERACTABLES & PHYSICS DATA
 */
const interactables = [];
const grabbedObjects = [null, null];
const prevCursorPos = [new THREE.Vector3(), new THREE.Vector3()];
let activeColor = "#00ffcc";

function createPrimitive(geo, pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: activeColor, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = { 
        radius, 
        velocity: new THREE.Vector3(), 
        idleRot: new THREE.Vector2(Math.random() * 0.02, Math.random() * 0.02) 
    };
    scene.add(mesh);
    interactables.push(mesh);
}

// Initial Spawn
createPrimitive(new THREE.TorusKnotGeometry(2.5, 0.6, 64, 12), new THREE.Vector3(-15, 10, 5), 4);
createPrimitive(new THREE.DodecahedronGeometry(3.5), new THREE.Vector3(15, 10, 5), 4);
createPrimitive(new THREE.IcosahedronGeometry(3.5), new THREE.Vector3(0, 18, 0), 4);

/**
 * 3. PARTICLE ENGINE
 */
const N = 8000;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(N * 3);
const currentBase = new Float32Array(N * 3);
const targetBase = new Float32Array(N * 3);

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({
    size: 0.6, color: activeColor, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Shape Transition Logic
function transitionToShape(shapeKey) {
    const data = Shapes.getShapeData(shapeKey, N);
    for(let i=0; i<N; i++) {
        targetBase[i*3] = data[i].x;
        targetBase[i*3+1] = data[i].y;
        targetBase[i*3+2] = data[i].z;
    }
}
transitionToShape('heart');

/**
 * 4. NEURAL TRACKING (MediaPipe)
 */
const cursors = [];
for(let i=0; i<2; i++) {
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 1.0, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    mesh.userData = { targetPos: new THREE.Vector3(), isPinched: false, scale: 1.0 };
    scene.add(mesh);
    cursors.push(mesh);
}

const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.5 });

const video = document.getElementById('webcam');
let targetTension = 0.3, currentTension = 0.3;

hands.onResults((results) => {
    // Hide loading screen on first results
    const loading = document.getElementById('loading');
    if(loading.style.opacity !== '0') {
        loading.style.opacity = '0';
        setTimeout(() => loading.style.display = 'none', 600);
    }

    cursors.forEach(c => c.visible = false);
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, i) => {
            if (i > 1) return;
            const cursor = cursors[i];
            cursor.visible = true;
            
            // Interaction Logic
            const thumb = landmarks[4], index = landmarks[8];
            const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
            cursor.userData.isPinched = dist < 0.06;

            // Mapping 2D Video to 3D Space
            const vec = new THREE.Vector3((1 - index.x) * 2 - 1, -(index.y * 2) + 1, 0.5);
            vec.unproject(camera).sub(camera.position).normalize();
            cursor.userData.targetPos.copy(camera.position).add(vec.multiplyScalar(35));
        });
    }
});

const cameraUtils = new window.Camera(video, {
    onFrame: async () => { await hands.send({image: video}); },
    width: 640, height: 480
});
cameraUtils.start();

/**
 * 5. ANIMATION LOOP (The Physics Core)
 */
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    currentTension += (targetTension - currentTension) * 0.1;

    // Handle Cursors & Grabbing
    cursors.forEach((cursor, i) => {
        if(!cursor.visible) return;

        const velocity = new THREE.Vector3().copy(cursor.userData.targetPos).sub(prevCursorPos[i]);
        prevCursorPos[i].copy(cursor.userData.targetPos);
        cursor.position.lerp(cursor.userData.targetPos, 0.3);

        let grabbed = grabbedObjects[i];
        if (cursor.userData.isPinched) {
            if (!grabbed) {
                interactables.forEach(obj => {
                    if (!obj.userData.held && cursor.position.distanceTo(obj.position) < 5) {
                        grabbedObjects[i] = obj;
                        obj.userData.held = true;
                    }
                });
            } else {
                grabbed.position.lerp(cursor.position, 0.4);
                grabbed.userData.velocity.copy(velocity);
            }
        } else if (grabbed) {
            grabbed.userData.held = false;
            grabbedObjects[i] = null;
        }
    });

    // Primitive Physics
    interactables.forEach(obj => {
        if (!obj.userData.held) {
            obj.position.add(obj.userData.velocity);
            obj.userData.velocity.multiplyScalar(0.96); // Friction
            obj.rotation.x += obj.userData.idleRot.x;
            // Simple Boundary Bounce
            if(Math.abs(obj.position.x) > 30) obj.userData.velocity.x *= -1;
            if(Math.abs(obj.position.y) > 20) obj.userData.velocity.y *= -1;
        }
    });

    // Particle Morphing
    const pArr = particleGeo.attributes.position.array;
    for(let i=0; i<N; i++) {
        const idx = i * 3;
        for(let j=0; j<3; j++) {
            const k = idx + j;
            currentBase[k] += (targetBase[k] - currentBase[k]) * 0.05;
            pArr[k] = currentBase[k] + Math.sin(time + currentBase[k]) * 0.5;
        }
    }
    particleGeo.attributes.position.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

/**
 * 6. UI EVENT LISTENERS
 */
document.querySelectorAll('button').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelector('button.active').classList.remove('active');
        e.target.classList.add('active');
        transitionToShape(e.target.dataset.shape);
    };
});

document.getElementById('colorPicker').oninput = (e) => {
    activeColor = e.target.value;
    particleMat.color.set(activeColor);
    interactables.forEach(obj => obj.material.color.set(activeColor));
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();