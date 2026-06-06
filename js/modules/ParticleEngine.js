// ParticleEngine.js - Three.js custom shaders, multi-buffer vertex calculations
import * as THREE from 'three';
import { getShapeData } from '../shapes.js'; // Direct relative import fix

class ParticleEngine {
  constructor(scene, vertexCount, color) {
    this.scene = scene;
    this.vertexCount = vertexCount;
    this.activeColor = new THREE.Color(color);

    // Geometry and material
    this.coreGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(vertexCount * 3);
    this.currentBase = new Float32Array(vertexCount * 3);
    this.targetBase = new Float32Array(vertexCount * 3);
    this.coreGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Default material
    this.defaultPointSize = 0.22;
    this.coreMat = new THREE.PointsMaterial({
      size: this.defaultPointSize,
      color: this.activeColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.centralObject = new THREE.Points(this.coreGeo, this.coreMat);
    this.scene.add(this.centralObject);

    // Shader material placeholder
    this.shaderMaterial = null;
    this.initShaderMaterial();

    // Morph targets and other advanced features - stubs
    this.morphTargets = {};
    this.flowField = new Map();
    this.isInstanced = false;
    this.instanceMesh = null;

    // Initialize with sphere
    this.setTargetShape('sphere');
  }

  initShaderMaterial() {
    console.log('Shader material placeholder - advanced features to be implemented');
  }

  setTargetShape(name) {
    // Fixed: Use explicitly imported module function instead of unassigned window globals
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
      console.warn("Shape generator failed, running procedural fallback layout:", e);
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
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uColor.value.copy(this.activeColor);
    }
  }

  setVertexCount(count) {
    this.coreGeo.dispose();
    if (this.instanceMesh) {
      this.instanceMesh.geometry.dispose();
      this.instanceMesh.material.dispose();
      this.scene.remove(this.instanceMesh);
    }

    this.vertexCount = count;
    this.positions = new Float32Array(count * 3);
    this.currentBase = new Float32Array(count * 3);
    this.targetBase = new Float32Array(count * 3);
    this.coreGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    if (this.isInstanced) {
      this.createInstancedMesh();
    }

    this.setTargetShape('sphere');
  }

  toggleInstancedMesh() {
    this.isInstanced = !this.isInstanced;
    if (this.isInstanced) {
      this.createInstancedMesh();
      this.scene.remove(this.centralObject);
      this.scene.add(this.instanceMesh);
    } else {
      this.scene.remove(this.instanceMesh);
      this.scene.add(this.centralObject);
    }
  }

  createInstancedMesh() {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({
      color: this.activeColor,
      transparent: true,
      opacity: 0.8
    });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.vertexCount);
    this.scene.add(this.instanceMesh);
  }

  updateFromPhysics(physicsPositions) {
    if (!physicsPositions || physicsPositions.length === 0) return;
    for (let i = 0; i < Math.min(physicsPositions.length / 3, this.vertexCount); i++) {
      this.positions[i * 3] = physicsPositions[i * 3];
      this.positions[i * 3 + 1] = physicsPositions[i * 3 + 1];
      this.positions[i * 3 + 2] = physicsPositions[i * 3 + 2];
    }
    this.coreGeo.attributes.position.needsUpdate = true;
  }

  update(time, targetPosition, targetZRotation, tension, handVelocity) {
    const pArr = this.coreGeo.attributes.position.array;
    const waveFrequency = 0.2 + (handVelocity * 0.06);
    const waveAmplitude = 0.10 + (handVelocity * 0.04);

    for (let i = 0; i < this.vertexCount * 3; i++) {
      this.currentBase[i] += (this.targetBase[i] - this.currentBase[i]) * 0.08;
    }

    for (let i = 0; i < this.vertexCount * 3; i++) {
      const base = this.currentBase[i] * tension;
      const wave = Math.sin(time * waveFrequency + i * 0.4) * waveAmplitude;
      pArr[i] = base + wave;
    }

    this.centralObject.position.lerp(targetPosition, 0.08);

    let diff = targetZRotation - this.centralObject.rotation.z;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.centralObject.rotation.z += diff * 0.05;

    const targetSize = this.defaultPointSize + (handVelocity * 0.04);
    this.coreMat.size = THREE.MathUtils.lerp(this.coreMat.size, targetSize, 0.1);

    this.coreGeo.attributes.position.needsUpdate = true;
  }

  getPosition() { return this.centralObject.position.clone(); }
  getRotation() { return this.centralObject.rotation.clone(); }
  resetRotation() { this.centralObject.rotation.set(0, 0, 0); }

  cleanup() {
    this.centralObject.geometry.dispose();
    this.centralObject.material.dispose();
    if (this.instanceMesh) {
      this.instanceMesh.geometry.dispose();
      this.instanceMesh.material.dispose();
      this.scene.remove(this.instanceMesh);
    }
  }
}

export { ParticleEngine };