# 🌌 Neural Particle Sandbox 3D

A high-performance, interactive 3D particle simulation that bridges the gap between Computer Vision and WebGL. Control a swarm of 8,000+ particles and physical 3D objects using real-time hand gestures tracked via your webcam.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r160-black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-green)

---

## 🌟 Key Features

### 🖐️ Neural Hand Tracking
Leverages **MediaPipe Hands** to track 21 3D landmarks. The system recognizes complex gestures like pinches and open-palm tension to manipulate the virtual environment without a mouse or keyboard.

### 🧊 Real-time Physics Engine
- **Momentum-based Interaction:** "Grab" 3D primitives and flick your wrist to throw them across the void.
- **Dynamic Friction & Bounds:** Objects bounce off invisible boundaries with realistic energy loss (damping).
- **Hysteresis Smoothing:** Anti-jitter logic ensures smooth object grabbing even with low-light camera feeds.

### 🌀 Particle Morphing
- **Geometric Templates:** Seamlessly morph between a Heart, Saturn, Flower, Buddha, and Firework shells.
- **Organic Motion:** Particles utilize trigonometric offsets to simulate a "living" swarm effect even when stationary.

---

## 🛠️ Tech Stack

- **Core Engine:** [Three.js](https://threejs.org/) (WebGL)
- **AI/ML:** [Google MediaPipe](https://google.github.io/mediapipe/)
- **Frontend:** HTML5, CSS3 (Glassmorphism UI), JavaScript ES6 Modules
- **Math:** Vector Calculus for particle displacement and easing functions.

---

## 📂 Project Structure

```text
particle-sandbox/
├── index.html          # Main entry point & UI layout
├── README.md           # Documentation
├── css/
│   └── style.css       # Glassmorphism UI & Animations
└── js/
    ├── main.js         # Scene initialization & Physics loop
    └── shapes.js       # Mathematical geometric templates

```

## 🎮 How to Use

- Allow Camera Access: The app requires your webcam to track hand movements (all processing is done locally on your device).
-
- Pinch to Grab: Bring your index finger and thumb together near a floating wireframe object to "pick it up."

- Throw: Move your hand quickly and release the pinch to apply momentum.

- Switch Shapes: Use the sidebar menu to morph the particle cloud into different mathematical structures.

---

## 🔧 Installation & Local Development

Since this project uses ES6 Modules, it must be served through a web server to avoid CORS issues.

1. Clone the repository:
    git clone [https://github.com/CalmOutlaws/neural-particle-sandbox.git](https://github.com/YOUR_USERNAME/neural-particle-sandbox.git)

2. **Navigate to the folder and start a local server:**
   - **VS Code:** Use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)      extension.
   - **Python:** Run `python -m http.server 8000` in the directory.
   - **Node.js:** Run `npx serve`.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed by Monish M**  
*Creative technologist exploring the intersection of AI and 3D graphics.*

---