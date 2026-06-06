// CameraEngine.js - MediaPipe tracking, smoothing algorithms, and gesture recognition
import * as THREE from 'three';

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

    // Smoothing parameters
    this.posSmoothing = 0.08;
    this.rotSmoothing = 0.05;

    // Gesture recognition state
    this.lastHandPos = new THREE.Vector2(0.5, 0.5);
    this.handVelocity = 0;

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
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.75
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

      console.log('CameraEngine initialized with MediaPipe');
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
    }
  }

  processHands(results) {
    // 1. Safely handle the loading screen removal
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
      results.multiHandLandmarks.forEach((landmarks, index) => {
        // 2. Safe check for MediaPipe drawing utilities to prevent silent crashes
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
      this.handVelocity = THREE.MathUtils.lerp(this.handVelocity, 0, 0.05);
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
    const targetTension = THREE.MathUtils.mapLinear(openness, 0.15, 0.5, 1.0, 4.2);

    const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
    const targetZRotation = -angle;

    const currentPos = new THREE.Vector2(indexTip.x, indexTip.y);
    const frameDist = currentPos.distanceTo(this.lastHandPos);
    this.handVelocity = THREE.MathUtils.lerp(this.handVelocity, frameDist * 15.0, 0.1);
    this.lastHandPos.copy(currentPos);

    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < 0.08;

    let targetPosition = new THREE.Vector3(0, 0, 0);
    if (isPinching) {
      const tx = (0.5 - indexTip.x) * 75;
      const ty = (0.5 - indexTip.y) * 55;
      targetPosition.set(tx, ty, 0);
    }

    this.latestData = {
      position: targetPosition,
      rotation: targetZRotation,
      tension: targetTension,
      velocity: this.handVelocity,
      openness: openness,
      isPinching: isPinching,
      handLandmarks: landmarks
    };
  }

  update() {
    if (!this.hands) {
      return this.getMouseFallbackData();
    }
    return this.latestData || null;
  }

  getMouseFallbackData() {
    return {
      position: new THREE.Vector3(0, 0, 0),
      rotation: 0,
      tension: 1.0,
      velocity: 0,
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
    // Fixed syntax error target check parenthetical encapsulation loop
    if (this.cameraUtils) {
      this.cameraUtils.stop();
    }
    if (this.hands) {
      this.hands.onResults(null);
    }
  }
}

export { CameraEngine };