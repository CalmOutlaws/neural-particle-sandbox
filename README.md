# Neural Particle Sandbox

A WebGL-based, gesture-controlled particle physics sandbox powered by Three.js, Cannon-es, MediaPipe, and the Web Audio API. 

The environment allows users to manipulate thousands of 3D particles in real time using computer vision hand tracking or mouse fallbacks, coupled with procedural shape transformations and adaptive audio synthesis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-orange)

---

## 🚀 Live Demo

Check out the interactive web application live here:
👉 **[Launch Neural Particle Sandbox](https://CalmOutlaws.github.io/neural-particle-sandbox/)** 

*(Replace the link above with your deployed GitHub Pages, Vercel, or Netlify URL)*

---

## ✨ Key Features

* **Real-Time Hand Tracking**: Uses MediaPipe Hands to detect 21 hand landmarks via webcam for low-latency pinch, openness, and rotation controls.
* **Dynamic Physics Engine**: Integrated Cannon-es rigid-body simulation converting hand coordinates into a real-time gravitational vector attraction field.
* **Interactive Audio Synthesis**: Low-latency synth engine built on the Web Audio API that dynamically modulates oscillator frequencies and filter cutoffs based on hand velocity and tension.
* **Procedural Vertex Transformations**: Morph particle streams across sphere, torus, cube, and custom mathematical layouts.
* **Gesture Recording & Timeline Loop**: In-memory circular buffer to record, store, and playback motion path sequences.
* **Mouse & Touch Fallback**: Automatic cursor degradation when no camera feed is detected or permissions are revoked.

---

## 🛠️ Tech Stack

* **Rendering Engine**: [Three.js](https://threejs.org/) (WebGL)
* **Physics Solver**: [Cannon-es](https://github.com/pmndrs/cannon-es)
* **Computer Vision**: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
* **Audio**: Native Web Audio API
* **Architecture**: Vanilla JavaScript (ES Modules)

---

## 📦 Project Structure

```text
neural-particle-sandbox/
├── index.html              # Shell markup & entry point
├── styles.css              # Glassmorphic UI overlays
└── js/
    ├── App.js              # Central lifecycle loop & module orchestration
    ├── shapes.js           # Procedural vertex coordinate generators
    └── modules/
        ├── ParticleEngine.js # BufferGeometry management & materials
        ├── CameraEngine.js   # MediaPipe pipeline & gesture processing
        ├── PhysicsEngine.js  # Cannon-es world & vector solvers
        ├── AudioEngine.js    # Web Audio synth chain
        └── UiEngine.js       # Timeline recorder & HUD state binding
