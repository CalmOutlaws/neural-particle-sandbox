// CameraEngine.js - MediaPipe tracking, smoothing algorithms, and gesture recognition
import * as THREE from 'three';

// ---- Configurable tracking constants ----
const POS_SMOOTHING = 0.08;
const ROT_SMOOTHING = 0.05;
const MIN_DETECTION_CONFIDENCE = 0.75;
const MIN_TRACKING_CONFIDENCE = 0.75;
const OPENNESS_MIN = 0.15;
const OPENNESS_MAX = 0.5;
const TENSION_MIN = 1.0;
const TENSION_MAX = 4.2;
const VELOCITY_SCALE = 15.0;
const VELOCITY_LERP = 0.1;
const VELOCITY_DECAY = 0.05;
const PINCH_THRESHOLD = 0.08;
const PINCH_X_MULT = 75;
const PINCH_Y_MULT = 55;
const MOUSE_SMOOTHING = 0.12;

class CameraEngine {
  constructor(isMobile) {
    this.isMobile = isMobile;
    this.hands = null;
    this.cameraUtils = null;
    this.video = document.getElementById('webcam');
    this.canvasElement = document.getElementById('output_canvas');
    this.canvasCtx = this.canvasElement.getContext('2d');

    // Tracking data
    this.latestData = null;
    this.isHandTracked = false;

    // Smoothing parameters
    this.posSmoothing = POS_SMOOTHING;
    this.rotSmoothing = ROT_SMOOTHING;

    // Gesture recognition state
    this.lastHandPos = new THREE.Vector2(0.5, 0.5);
    this.handVelocity = 0;

    // Mouse fallback tracking with smooth dampening
    this.mouseX = 0.5;
    this.mouseY = 0.5;
    this.smoothMouseX = 0.5;
    this.smoothMouseY = 0.5;
    this.mouseActive = false;
    this._onMouseMove = (e) => {
      this.mouseX = e.clientX / window.innerWidth;
      this.mouseY = 1.0 - (e.clientY / window.innerHeight);
      this.mouseActive = true;
    };
    window.addEventListener('mousemove', this._onMouseMove);

    // Reusable objects to avoid per-frame allocations
    this._currentPos = new THREE.Vector2();
    this._targetPosition = new THREE.Vector3();

    // Initialize MediaPipe
    this.initMediaPipe();
  }

  initMediaPipe() {
    try {
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: this.isMobile ? 0 : 1,
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: MIN_TRACKING_CONFIDENCE
      });

      this.hands.onResults((results) => {
        this.processHands(results);
      });

      this.cameraUtils = new window.Camera(this.video, {
        onFrame: async () => { await this.hands.send({image: this.video}); },
        width: this.isMobile ? 480 : 640,
        height: this.isMobile ? 360 : 480
      });
      this.cameraUtils.start();
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
    }
  }

  processHands(results) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        if (loader && loader.parentNode) loader.remove();
      }, 500);
    }

    if (this.canvasElement.width !== this.video.videoWidth || this.canvasElement.height !== this.video.videoHeight) {
      this.canvasElement.width = this.video.videoWidth;
      this.canvasElement.height = this.video.videoHeight;
    }

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      this.isHandTracked = true;
      results.multiHandLandmarks.forEach((landmarks, index) => {
        if (typeof window.drawConnectors === 'function' && window.HAND_CONNECTIONS) {
          window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#ff007f', lineWidth: 2});
        } else if (typeof window.mpHands !== 'undefined' && window.mpHands.drawConnectors) {
          window.mpHands.drawConnectors(this.canvasCtx, landmarks, window.mpHands.HAND_CONNECTIONS, {color: '#ff007f', lineWidth: 2});
        }

        if (index === 0) {
          this.processHandData(landmarks);
        }
      });
    } else {
      this.isHandTracked = false;
      this.handVelocity = THREE.MathUtils.lerp(this.handVelocity, 0, VELOCITY_DECAY);
    }

    this.canvasCtx.restore();
  }

  processHandData(landmarks) {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const pinkyBase = landmarks[17];
    const indexBase = landmarks[5];

    const openness = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const targetTension = THREE.MathUtils.mapLinear(openness, OPENNESS_MIN, OPENNESS_MAX, TENSION_MIN, TENSION_MAX);

    const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
    const targetZRotation = -angle;

    this._currentPos.set(indexTip.x, indexTip.y);
    const frameDist = this._currentPos.distanceTo(this.lastHandPos);
    this.handVelocity = THREE.MathUtils.lerp(this.handVelocity, frameDist * VELOCITY_SCALE, VELOCITY_LERP);
    this.lastHandPos.copy(this._currentPos);

    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < PINCH_THRESHOLD;

    if (isPinching) {
      this._targetPosition.set(
        (0.5 - indexTip.x) * PINCH_X_MULT,
        (0.5 - indexTip.y) * PINCH_Y_MULT,
        0
      );
    } else {
      this._targetPosition.set(0, 0, 0);
    }

    this.latestData = {
      position: this._targetPosition.clone(),
      rotation: targetZRotation,
      tension: targetTension,
      velocity: this.handVelocity,
      openness: openness,
      isPinching: isPinching,
      handLandmarks: landmarks
    };
  }

  update() {
    if (!this.hands || !this.isHandTracked) {
      return this.getMouseFallbackData();
    }
    return this.latestData || null;
  }

  getMouseFallbackData() {
    // Smooth dampening for cursor position
    this.smoothMouseX = THREE.MathUtils.lerp(this.smoothMouseX, this.mouseX, MOUSE_SMOOTHING);
    this.smoothMouseY = THREE.MathUtils.lerp(this.smoothMouseY, this.mouseY, MOUSE_SMOOTHING);

    // Map smoothed mouse to world-space position
    this._targetPosition.set(
      (0.5 - this.smoothMouseX) * PINCH_X_MULT,
      (0.5 - this.smoothMouseY) * PINCH_Y_MULT,
      0
    );

    return {
      position: this._targetPosition,
      rotation: 0,
      tension: TENSION_MIN,
      velocity: this.handVelocity,
      openness: 0.3,
      isPinching: false
    };
  }

  getHandData(handIndex = 0) { return this.latestData; }
  getHandCount() { return this.latestData && this.latestData.handLandmarks ? 1 : 0; }

  detectGesture() {
    if (!this.latestData) return null;
    const { isPinching, openness } = this.latestData;
    if (isPinching) return 'pinch';
    if (openness > 0.4) return 'open_palm';
    return 'fist';
  }

  cleanup() {
    window.removeEventListener('mousemove', this._onMouseMove);
    if (this.cameraUtils) {
      this.cameraUtils.stop();
    }
    if (this.hands) {
      this.hands.onResults(null);
    }
  }
}

export { CameraEngine };
