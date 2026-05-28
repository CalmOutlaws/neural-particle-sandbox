# 🌌 Neural Particle Sandbox 3D

A high-performance, interactive 3D particle simulation that bridges the gap between Computer Vision, WebGL, and Spatial Audio Synthesis. Control an adaptive swarm of thousands of particles, interact with responsive UI overlays, and manipulate geometric arrays using real-time hand tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r160-black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-green)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Active-orange)

---

## 🚀 Live Demo
**[Check out the Live Experience here!](https://calmoutlaws.github.io/neural-particle-sandbox/)**

---

## 🌟 Key Features

### 🖐️ Neural Hand Tracking & Inertial Physics
Leverages **MediaPipe Hands** to map 21 3D tracking landmarks with a lightweight processing footprint. 
- **1:1 Precision Rotation:** Features vector-calibrated tracking loops ($Modulus\ \pi$) for smooth, jitter-free wrist rotation tracking on the Z-axis.
- **Damped Positional Easing:** Custom linear interpolations ($lerp$) mimic physical weight and momentum when grabbing or dragging the particle core.

### 🔊 Generative Web Audio API Synth Engine
Integrates real-time, cross-browser interactive audio synthesis.
- **Dynamic Frequency Modulation:** Spreading your palm open scales up the geometric expansion while raising the tone's pitch dynamically between $90\text{ Hz}$ and $280\text{ Hz}$.
- **Kinetic Gain Scaling:** Fast hand motions increase oscillator volume intensity safely, dropping back down to a faint ambient background hum when your hand remains static.

### 🌀 Advanced Core Geometry Morphology
- **12 Dynamic Math Models:** Morph seamlessly between a Sphere, Heart, Torus Ring, DNA Double Helix, Trefoil Knot, Cyber Pyramid, Infinity Ribbon, Cosmic Cylinder, Hyper Hourglass, Grid Matrix, Mobius Strip, and a Cosmic Cube.
- **Velocity-Mapped Trails:** Rapid hand translations alter the point-material matrices, expanding the physical radius of individual vertices to produce trailing cloud embers.
- **Holographic Protection Shield:** Features an independent Icosahedron Wireframe mesh bound to active scaling variables that deploys on boot to surround the core structure.

---

## 🛠️ Tech Stack

- **3D Graphics Engine:** [Three.js](https://threejs.org/) (WebGL 2.0 Acceleration)
- **Computer Vision API:** [Google MediaPipe Hands](https://google.github.io/mediapipe/)
- **Audio Engine:** Native Browser Web Audio API (Triangle Wave Oscillators & Damped Gain Nodes)
- **Frontend Architecture:** Glassmorphic CSS UI Engine featuring scroll track optimizations for low-resolution viewports.

---

## 📂 Project Structure

```text
particle-sandbox/
├── index.html          # Entry point, glassmorphic UI layout & select element dropdown
├── README.md           # Portfolio documentation
├── css/
│   └── style.css       # Layout rules, mobile media viewports & custom webkit scrollbars
└── js/
    ├── main.js         # Loop controller, web audio routing, and tracking interpolation
    └── shapes.js       # Mathematical algorithms generating vector coordinate data

```

🎮 How to Use
Allow Camera Access: Give your browser permission to utilize your webcam. All computing and vision calculations are executed entirely locally on your device's hardware.

Pinch to Grab: Bring your index finger and thumb together near the core to anchor your position coordinates and drag the object.

Rotate Hand: Tilt your hand side-to-side to roll the geometry smoothly on its rotational axis.

Expand Palm: Spread your fingers apart to blow out particle clusters, scale up the hologram shield, and modulate synth engine frequencies.

Interactive Sidebar Panel: Use the glassmorphism control hub to trigger audio toggles, swap between 12 mathematical layout styles, or change the active vector color profile.
---

## 🔧 Installation & Local Development

Since this project uses ES6 Modules, it must be served through a web server to avoid CORS issues.

1. Clone the repository:
    git clone [https://github.com/YOUR_USERNAME/neural-particle-sandbox.git](https://github.com/YOUR_USERNAME/neural-particle-sandbox.git)

2. **Navigate to the folder and start a local server:**
   - **VS Code:** Use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)      extension.
   - **Python:** Run `python -m http.server 8000` in the directory.
   - **Node.js:** Run `npx serve`.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed by Monish M**  
*Creative technologist exploring the intersection of AI, Web Audio Synthesis, and 3D graphics.*

---
