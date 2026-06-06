// App.js - Core entry point, loop manager, and state manager
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { CameraEngine } from './modules/CameraEngine.js';
import { ParticleEngine } from './modules/ParticleEngine.js';
import { PhysicsEngine } from './modules/PhysicsEngine.js';
import { AudioEngine } from './modules/AudioEngine.js';
import { UiEngine } from './modules/UiEngine.js';

class App {
  constructor() {
    this.isInitialized = false;
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.vertexCount = this.isMobile ? 1500 : 4000;

    // Three.js setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 35);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // State management
    this.activeColor = "#ff007f";
    this.targetTension = 1.0;
    this.currentTension = 1.0;
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.handVelocity = 0;
    this.lastHandPos = new THREE.Vector2(0.5, 0.5);
    this.targetZRotation = 0;

    // Recording/Playback flags
    this.isRecording = false;
    this.isPlayingBack = false;

    // Shield
    this.shieldMesh = null;
    this.shieldActive = true;

    // Engines
    this.cameraEngine = null;
    this.particleEngine = null;
    this.physicsEngine = null;
    this.audioEngine = null;
    this.uiEngine = null;

    // Performance telemetry
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;

    // Safe Initialization Launch
    this.init();
  }

  async init() {
    try {
      // Initialize engines
      this.cameraEngine = new CameraEngine(this.isMobile);
      this.particleEngine = new ParticleEngine(this.scene, this.vertexCount, this.activeColor);
      this.physicsEngine = new PhysicsEngine(this.scene);
      this.audioEngine = new AudioEngine();
      this.uiEngine = new UiEngine();

      // Set up event listeners
      this.setupEventListeners();

      // Initialize shield
      this.createShieldMesh();

      // Remove loading screen overlay once engine confirms loadout completion
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => loadingEl.remove(), 500);
      }

      this.isInitialized = true;
      console.log('Neural Particle Sandbox initialized successfully.');
      
      // Explicitly kickstart animation loop ONLY after setup completely finishes
      this.animate();
    } catch (error) {
      console.error('Failed to initialize app modules safely:', error);
    }
  }

  setupEventListeners() {
    // Shield toggle
    document.getElementById('shieldToggleBtn').onclick = (e) => {
      this.shieldActive = !this.shieldActive;
      if (this.shieldActive) {
        this.createShieldMesh();
        e.target.innerText = "Collapse Shield";
        e.target.style.background = "#ff007f";
      } else {
        if (this.shieldMesh) {
          this.scene.remove(this.shieldMesh);
          this.shieldMesh = null;
        }
        e.target.innerText = "Deploy Hologram Shield";
        e.target.style.background = "#2e2e2e";
      }
    };

    // Audio toggle
    document.getElementById('audioToggleBtn').onclick = (e) => {
      if (!this.audioEngine) return;
      this.audioEngine.toggle();
      if (this.audioEngine.enabled) {
        e.target.innerText = "Disable Audio Engine";
        e.target.style.background = "#ff007f";
        document.getElementById('stat-audio').innerText = "LIVE ACTIVE";
      } else {
        e.target.innerText = "Enable Audio Engine";
        e.target.style.background = "#2e2e2e";
        document.getElementById('stat-audio').innerText = "MUTED";
      }
    };

    // Color picker
    document.getElementById('colorPicker').addEventListener('input', (e) => {
      this.activeColor = e.target.value;
      if (this.particleEngine) this.particleEngine.setColor(this.activeColor);
      if (this.shieldMesh) this.shieldMesh.material.color.set(this.activeColor);
      const badge = document.querySelector('.badge');
      if (badge) badge.style.background = this.activeColor;
    });

    // Reset button
    document.getElementById('resetBtn').onclick = () => {
      this.targetPosition.set(0, 0, 0);
      this.targetZRotation = 0;
      if (this.particleEngine) this.particleEngine.resetRotation();
    };

    // Physics toggle listener updating
    document.getElementById('physicsToggleBtn').onclick = (e) => {
      if (!this.physicsEngine) return;
      this.physicsEngine.toggle(this.vertexCount); // Passes the true vertex stream length
      if (this.physicsEngine.enabled) {
        e.target.innerText = "Physics: ON";
        e.target.style.background = "#ff007f";
        document.getElementById('stat-physics').innerText = "ACTIVE";
      } else {
        e.target.innerText = "Physics: OFF";
        e.target.style.background = "#2e2e2e";
        document.getElementById('stat-physics').innerText = "INACTIVE";
      }
    };

    // Record gesture
    document.getElementById('recordBtn').onclick = (e) => {
      if (!this.uiEngine) return;
      this.isRecording = !this.isRecording;
      if (this.isRecording) {
        this.uiEngine.startRecording();
        e.target.innerText = "Recording...";
        e.target.style.background = "#ff007f";
      } else {
        e.target.innerText = "Record Gesture";
        e.target.style.background = "#2e2e2e";
        const count = this.uiEngine.stopRecording();
        alert(`Recorded ${count} gesture points`);
      }
    };

    // Playback gesture (Updated to clean up timeline states)
    document.getElementById('playbackBtn').onclick = (e) => {
      if (!this.uiEngine) return;
      if (this.uiEngine.getRecordedGestureCount() === 0) {
        alert("No gestures recorded yet!");
        return;
      }
      this.isPlayingBack = !this.isPlayingBack;
      if (this.isPlayingBack) {
        this.uiEngine.startPlayback();
        e.target.innerText = "Stop Playback";
        e.target.style.background = "#ff007f";
      } else {
        this.uiEngine.stopPlayback(); // Fixes sticky timeline data loops
        e.target.innerText = "Playback";
        e.target.style.background = "#2e2e2e";
      }
    };

    // Export simulation
    document.getElementById('exportBtn').onclick = () => {
      if (!this.uiEngine) return;
      const data = {
        settings: {
          vertexCount: this.vertexCount,
          activeColor: this.activeColor,
          shieldActive: this.shieldActive
        },
        gestures: this.uiEngine.getRecordedGestures()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "neural-particle-simulation.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };

    // Performance mode
    document.getElementById('performanceSelect').addEventListener('change', (e) => {
      if (!this.particleEngine) return;
      const mode = e.target.value;
      switch(mode) {
        case 'ultra': this.vertexCount = 8000; break;
        case 'high':  this.vertexCount = this.isMobile ? 1500 : 4000; break;
        case 'medium': this.vertexCount = this.isMobile ? 800 : 2000; break;
        case 'low':    this.vertexCount = this.isMobile ? 400 : 1000; break;
        case 'mobile': this.vertexCount = 800; break;
      }
      this.particleEngine.setVertexCount(this.vertexCount);
    });

    // Shape selector
    document.getElementById('shapeSelector').addEventListener('change', (e) => {
      if (this.particleEngine) this.particleEngine.setTargetShape(e.target.value);
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  createShieldMesh() {
    if (this.shieldMesh) this.scene.remove(this.shieldMesh);
    const shieldGeo = new THREE.IcosahedronGeometry(6.5, this.isMobile ? 1 : 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: this.activeColor,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.scene.add(this.shieldMesh);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Defensive Guard: Block execution loops until tracking modules are ready
    if (!this.isInitialized) return;

    const time = performance.now() * 0.001;

    // Update telemetry and FPS
    this.frameCount++;
    if (performance.now() >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (performance.now() - this.lastTime));
      const fpsCounter = document.getElementById('fps-counter');
      if (fpsCounter) fpsCounter.innerText = `${this.fps} FPS`;
      this.frameCount = 0;
      this.lastTime = performance.now();
    }
    const velocityStat = document.getElementById('stat-velocity');
    if (velocityStat) velocityStat.innerText = this.handVelocity.toFixed(2);

    // Update engines
    if (this.cameraEngine) {
      const trackingData = this.cameraEngine.update();
      if (trackingData) {
        this.targetPosition.copy(trackingData.position);
        this.targetZRotation = trackingData.rotation;
        this.targetTension = trackingData.tension;
        this.handVelocity = trackingData.velocity;

        // Update audio based on hand data
        if (this.audioEngine && this.audioEngine.enabled) {
          this.audioEngine.updateParameters(trackingData.openness, trackingData.velocity);
        }
      }
    }

    // Handle gesture recording/playback
    if (this.isRecording && this.uiEngine) {
      this.uiEngine.recordGesture({
        position: this.targetPosition.clone(),
        rotation: this.targetZRotation,
        tension: this.targetTension,
        handVelocity: this.handVelocity
      });
    }

    if (this.isPlayingBack && this.uiEngine) {
      const playbackData = this.uiEngine.updatePlayback();
      if (playbackData) {
        this.targetPosition.copy(playbackData.position);
        this.targetZRotation = playbackData.rotation;
        this.targetTension = playbackData.tension;
        this.handVelocity = playbackData.handVelocity;
      }
    }

    if (this.physicsEngine && this.physicsEngine.enabled) {
      // Pass your target tracking vector directly into the solver sequence
      this.physicsEngine.update(time, this.targetPosition);
      
      const physicsPositions = this.physicsEngine.getParticlePositions();
      if (this.particleEngine) {
        this.particleEngine.updateFromPhysics(physicsPositions);
      }
    } else if (this.particleEngine) {
      // Update particle engine normally
      this.particleEngine.update(time, this.targetPosition, this.targetZRotation, this.currentTension, this.handVelocity);

      // Smooth tension
      this.currentTension = THREE.MathUtils.lerp(this.currentTension, this.targetTension, 0.06);
    }

    // Update shield
    if (this.shieldActive && this.shieldMesh && this.particleEngine) {
      this.shieldMesh.position.copy(this.particleEngine.getPosition());
      this.shieldMesh.rotation.z = this.particleEngine.getRotation().z;
      this.shieldMesh.rotation.y += 0.004;
      this.shieldMesh.scale.setScalar(this.currentTension * 1.4);
    }

    // Update controls and render
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate App Safely
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});