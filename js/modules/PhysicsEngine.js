// PhysicsEngine.js - Cannon-es rigid bodies, vector attraction, and fields
import * as CANNON from 'cannon-es';

// ---- Configurable physics constants ----
const PARTICLE_RADIUS = 0.08;
const PARTICLE_MASS = 0.005;
const ATTRACTION_STRENGTH = 40.0;
const GRAVITY = -4.0;
const SOLVER_ITERATIONS = 5;
const SOLVER_TOLERANCE = 0.1;
const LINEAR_DAMPING = 0.05;
const ANGULAR_DAMPING = 1.0;
const MIN_DISTANCE = 0.1;
const DISTANCE_FACTOR = 0.2;
const DISTANCE_OFFSET = 0.5;
const SPAWN_RADIUS_MIN = 2;
const SPAWN_RADIUS_MAX = 8;
const SPAWN_HEIGHT_OFFSET = 10;

class PhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.world = null;
    this.bodies = [];
    this.enabled = false;

    // Dynamic tracking anchor
    this.attractionPoint = new CANNON.Vec3(0, 0, 0);

    // Pre-allocated reusable objects
    this._forceVec = new CANNON.Vec3();
    this._positionsBuffer = null;
  }

  init(totalVertices = 1500) {
    if (this.world) this.cleanup();

    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY, 0);

    // Optimize solver for high particle counts
    this.world.quatNormalizeSkip = 0;
    this.world.quatNormalizeFast = true;

    const solver = new CANNON.GSSolver();
    solver.iterations = SOLVER_ITERATIONS;
    solver.tolerance = SOLVER_TOLERANCE;
    this.world.solver = solver;

    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Create rigid bodies
    this.bodies = [];
    for (let i = 0; i < totalVertices; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = SPAWN_RADIUS_MIN + Math.random() * SPAWN_RADIUS_MAX;

      const sphereBody = new CANNON.Body({
        mass: PARTICLE_MASS,
        shape: new CANNON.Sphere(PARTICLE_RADIUS),
        linearDamping: LINEAR_DAMPING,
        angularDamping: ANGULAR_DAMPING,
        position: new CANNON.Vec3(
          r * Math.sin(phi) * Math.cos(theta),
          SPAWN_HEIGHT_OFFSET + r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )
      });

      this.world.addBody(sphereBody);
      this.bodies.push(sphereBody);
    }

    // Pre-allocate positions buffer (reused every frame)
    this._positionsBuffer = new Float32Array(totalVertices * 3);
  }

  update(time, currentHandPos = null) {
    if (!this.world || !this.enabled) return;

    this.world.step(1 / 60, time, 2);

    if (currentHandPos) {
      this.attractionPoint.set(currentHandPos.x, currentHandPos.y, currentHandPos.z);
    }

    const strength = this.inversionEnabled ? -ATTRACTION_STRENGTH : ATTRACTION_STRENGTH;

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];

      this.attractionPoint.vsub(body.position, this._forceVec);

      const distance = this._forceVec.length();

      if (distance > MIN_DISTANCE) {
        this._forceVec.normalize();

        const scalarForce = (strength * PARTICLE_MASS) / (distance * DISTANCE_FACTOR + DISTANCE_OFFSET);
        this._forceVec.scale(scalarForce, this._forceVec);

        body.applyForce(this._forceVec, body.position);
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
    if (!this._positionsBuffer) return new Float32Array(0);
    for (let i = 0; i < this.bodies.length; i++) {
      const pos = this.bodies[i].position;
      this._positionsBuffer[i * 3] = pos.x;
      this._positionsBuffer[i * 3 + 1] = pos.y;
      this._positionsBuffer[i * 3 + 2] = pos.z;
    }
    return this._positionsBuffer;
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
    this._positionsBuffer = null;
  }
}

export { PhysicsEngine };
