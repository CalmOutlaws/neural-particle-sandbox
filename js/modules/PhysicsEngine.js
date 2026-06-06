// PhysicsEngine.js - Cannon-es rigid bodies, vector attraction, and fields
import * as CANNON from 'cannon-es';

class PhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.world = null;
    this.bodies = [];
    this.enabled = false;
    
    // Configured for high-performance particle streams
    this.particleRadius = 0.08;
    this.particleMass = 0.005;
    
    // Dynamic tracking anchors
    this.attractionPoint = new CANNON.Vec3(0, 0, 0);
    this.attractionStrength = 40.0;
    
    this.friction = 0.02;
    this.viscosity = 0.05; // Air/Fluid drag coefficient
    this.inversionEnabled = false;
  }

  init(totalVertices = 1500) {
    if (this.world) this.cleanup();

    // Initialize physics world with minimal solver overhead
    this.world = new CANNON.World();
    this.world.gravity.set(0, -4.0, 0); // Lighter gravity for floaty, cosmic feel

    // Optimize solver steps for high particle counts
    this.world.quatNormalizeSkip = 0;
    this.world.quatNormalizeFast = true;
    
    const solver = new CANNON.GSSolver();
    solver.iterations = 5; // Reduced iterations for dramatic performance scaling
    solver.tolerance = 0.1;
    this.world.solver = solver;
    
    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Create unique physical bodies matching your exact particle counts
    this.bodies = [];
    for (let i = 0; i < totalVertices; i++) {
      // Cluster them procedurally around center to avoid explosion on spawn
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 2 + Math.random() * 8;

      const sphereBody = new CANNON.Body({
        mass: this.particleMass,
        shape: new CANNON.Sphere(this.particleRadius),
        linearDamping: this.viscosity, // Prevents particles from accelerating to infinity
        angularDamping: 1.0,
        position: new CANNON.Vec3(
          r * Math.sin(phi) * Math.cos(theta),
          10 + r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )
      });

      this.world.addBody(sphereBody);
      this.bodies.push(sphereBody);
    }

    console.log(`PhysicsEngine dynamically calibrated with ${this.bodies.length} active rigid bodies.`);
  }

  update(time, currentHandPos = null) {
    if (!this.world || !this.enabled) return;

    // Step the simulation
    this.world.step(1 / 60, time, 2);

    // Sync tracking system position targets if available
    if (currentHandPos) {
      this.attractionPoint.set(currentHandPos.x, currentHandPos.y, currentHandPos.z);
    }

    // Apply force vectors across entire multi-body system
    const forceVec = new CANNON.Vec3();
    const strength = this.inversionEnabled ? -this.attractionStrength : this.attractionStrength;

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      // Calculate directional vector pointing toward your hand tracking coordinate
      this.attractionPoint.vsub(body.position, forceVec);
      
      const distance = forceVec.length();
      
      if (distance > 0.1) {
        forceVec.normalize();
        
        // Gravitational attraction formula: Force decreases slightly over distance
        const scalarForce = (strength * this.particleMass) / (distance * 0.2 + 0.5);
        forceVec.scale(scalarForce, forceVec);
        
        // Inject velocity impulse directly into body profile
        body.applyForce(forceVec, body.position);
      }
    }
  }

  toggle(totalVertices = 1500) {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init(totalVertices);
    } else {
      this.cleanup();
    }
  }

  getParticlePositions() {
    const positions = [];
    for (let i = 0; i < this.bodies.length; i++) {
      const pos = this.bodies[i].position;
      positions.push(pos.x, pos.y, pos.z);
    }
    return positions;
  }

  setInversion(enabled) {
    this.inversionEnabled = enabled;
  }

  cleanup() {
    if (this.world) {
      for (let i = 0; i < this.bodies.length; i++) {
        this.world.removeBody(this.bodies[i]);
      }
      this.world = null;
    }
    this.bodies = [];
  }
}

export { PhysicsEngine };