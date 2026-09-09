// ParticleEngine.js - Three.js custom shaders, multi-buffer vertex calculations
import * as THREE from 'three';
import { getShapeData } from '../shapes.js';

// ---- Configurable visual constants ----
const DEFAULT_POINT_SIZE = 0.22;
const DEFAULT_OPACITY = 0.85;
const BASE_LERP_FACTOR = 0.08;
const WAVE_FREQUENCY_BASE = 0.2;
const WAVE_FREQUENCY_VELOCITY = 0.06;
const WAVE_AMPLITUDE_BASE = 0.10;
const WAVE_AMPLITUDE_VELOCITY = 0.04;
const WAVE_PHASE_SCALE = 0.4;
const POSITION_LERP = 0.08;
const ROTATION_LERP = 0.05;
const SIZE_VELOCITY_FACTOR = 0.04;
const SIZE_LERP = 0.1;
const GLOW_SIZE_ATTENUATION = 300.0;
const GLOW_SCALE_VARIATION = 0.5;

// ---- Glow / bloom shader programs ----
const glowVertexShader = 
  attribute float aScale;
  varying float vDistance;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -mvPosition.z;
    gl_PointSize = aScale *  / max(-mvPosition.z, 0.1);
    gl_Position = projectionMatrix * mvPosition;
  }
;

const glowFragmentShader = 
  varying float vDistance;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(uColor, glow * uOpacity);
  }
;

class ParticleEngine {
  constructor(scene, vertexCount, color) {
    this.scene = scene;
    this.vertexCount = vertexCount;
    this.activeColor = new THREE.Color(color);

    // Geometry buffers
    this.coreGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(vertexCount * 3);
    this.currentBase = new Float32Array(vertexCount * 3);
    this.targetBase = new Float32Array(vertexCount * 3);
    this.scales = new Float32Array(vertexCount);
    this.coreGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.coreGeo.setAttribute('aScale', new THREE.BufferAttribute(this.scales, 1));

    // Per-particle scale variation for visual depth
    for (let i = 0; i < vertexCount; i++) {
      this.scales[i] = 1.0 + (Math.random() - 0.5) * GLOW_SCALE_VARIATION;
    }

    // Standard material
    this.coreMat = new THREE.PointsMaterial({
      size: DEFAULT_POINT_SIZE,
      color: this.activeColor,
      transparent: true,
      opacity: DEFAULT_OPACITY,
      blending: THREE.AdditiveBlending
    });

    // Glow shader material
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: DEFAULT_OPACITY }
      },
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowEnabled = false;

    this.centralObject = new THREE.Points(this.coreGeo, this.coreMat);
    this.scene.add(this.centralObject);

    // Reusable objects to avoid per-frame allocations
    this._tmpVec3 = new THREE.Vector3();

    // Initialize with sphere
    this.setTargetShape('sphere');
  }

  setTargetShape(name) {
    try {
      const data = getShapeData(name, this.vertexCount);
      if (data && data.length > 0) {
        for (let i = 0; i < this.vertexCount; i++) {
          if (data[i]) {
            this.targetBase[i * 3] = data[i].x;
            this.targetBase[i * 3 + 1] = data[i].y;
            this.targetBase[i * 3 + 2] = data[i].z;
          }
        }
        return;
      }
    } catch (e) {
      // Procedural fallback
    }

    // Procedural fallback
    for (let i = 0; i < this.vertexCount; i++) {
      const phase = (i / this.vertexCount) * Math.PI * 2;
      this.targetBase[i * 3] = Math.sin(phase) * 5;
      this.targetBase[i * 3 + 1] = Math.cos(phase) * 5;
      this.targetBase[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
  }

  setColor(color) {
    this.activeColor = new THREE.Color(color);
    this.coreMat.color.copy(this.activeColor);
    this.glowMat.uniforms.uColor.value.copy(this.activeColor);
  }

  setVertexCount(count) {
    this.coreGeo.dispose();

    this.vertexCount = count;
    this.positions = new Float32Array(count * 3);
    this.currentBase = new Float32Array(count * 3);
    this.targetBase = new Float32Array(count * 3);
    this.scales = new Float32Array(count);
    this.coreGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.coreGeo.setAttribute('aScale', new THREE.BufferAttribute(this.scales, 1));

    for (let i = 0; i < count; i++) {
      this.scales[i] = 1.0 + (Math.random() - 0.5) * GLOW_SCALE_VARIATION;
    }

    this.setTargetShape('sphere');
  }

  toggleGlow() {
    this.glowEnabled = !this.glowEnabled;
    this.centralObject.material = this.glowEnabled ? this.glowMat : this.coreMat;
    return this.glowEnabled;
  }

  updateFromPhysics(physicsPositions) {
    if (!physicsPositions || physicsPositions.length === 0) return;
    const len = Math.min(physicsPositions.length, this.vertexCount * 3);
    for (let i = 0; i < len; i++) {
      this.positions[i] = physicsPositions[i];
    }
    this.coreGeo.attributes.position.needsUpdate = true;
  }

  update(time, targetPosition, targetZRotation, tension, handVelocity) {
    const pArr = this.coreGeo.attributes.position.array;
    const waveFrequency = WAVE_FREQUENCY_BASE + (handVelocity * WAVE_FREQUENCY_VELOCITY);
    const waveAmplitude = WAVE_AMPLITUDE_BASE + (handVelocity * WAVE_AMPLITUDE_VELOCITY);

    for (let i = 0; i < this.vertexCount * 3; i++) {
      this.currentBase[i] += (this.targetBase[i] - this.currentBase[i]) * BASE_LERP_FACTOR;
    }

    for (let i = 0; i < this.vertexCount * 3; i++) {
      const base = this.currentBase[i] * tension;
      const wave = Math.sin(time * waveFrequency + i * WAVE_PHASE_SCALE) * waveAmplitude;
      pArr[i] = base + wave;
    }

    this.centralObject.position.lerp(targetPosition, POSITION_LERP);

    let diff = targetZRotation - this.centralObject.rotation.z;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.centralObject.rotation.z += diff * ROTATION_LERP;

    // Only lerp point size when using standard material (glow shader controls its own size)
    if (!this.glowEnabled) {
      const targetSize = DEFAULT_POINT_SIZE + (handVelocity * SIZE_VELOCITY_FACTOR);
      this.coreMat.size = THREE.MathUtils.lerp(this.coreMat.size, targetSize, SIZE_LERP);
    }

    this.coreGeo.attributes.position.needsUpdate = true;
  }

  getPosition() { return this.centralObject.position; }
  getRotation() { return this.centralObject.rotation; }
  getPositionClone() { return this.centralObject.position.clone(); }
  getRotationClone() { return this.centralObject.rotation.clone(); }
  resetRotation() { this.centralObject.rotation.set(0, 0, 0); }

  cleanup() {
    this.centralObject.geometry.dispose();
    this.centralObject.material.dispose();
    this.glowMat.dispose();
  }
}

export { ParticleEngine };
