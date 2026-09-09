# Neural Particle Sandbox

A WebGL gesture-controlled particle physics environment powered by Three.js, Cannon.js, and MediaPipe.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r160-black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-green)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Active-orange)

## Key Features

- **Real-time hand landmark tracking** via MediaPipe Hands (21 landmarks per hand, 30+ FPS on most devices)
- **Custom vertex layouts** with 15+ procedural shape generators (sphere, torus, helix, trefoil, mobius, etc.)
- **Web Audio spatial synthesis** with polyphonic oscillator voices and tension-driven filter sweeps
- **Vector attraction physics** using Cannon-es rigid body solver with configurable force fields
- **Gesture recording and playback** with JSON export for sharing simulations
- **Adaptive performance scaling** from 800 to 8,000 particles depending on device capability
- **Optional glow shader** with per-particle size attenuation and additive blending

## Tech Stack

| Layer | Technology |
|-------|------------|
| 3D Rendering | Three.js (WebGL 2.0) |
| Physics | Cannon-es |
| Hand Tracking | MediaPipe Hands |
| Audio | Web Audio API |
| Module System | ES Modules (native browser importmaps) |

## Local Setup

This project uses native ES Module imports via importmaps, so it must be served over HTTP. Opening `index.html` directly via `file://` will fail due to CORS restrictions.

**Option 1: VS Code Live Server**
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` and select "Open with Live Server"

**Option 2: Node.js**
```bash
npx serve
```

**Option 3: Python**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Controls & Interactions

### Hand Gestures (requires webcam)

| Gesture | Action |
|---------|--------|
| Pinch (thumb + index) | Grab and drag the particle core |
| Rotate hand | Spin the geometry on its Z-axis |
| Open palm (spread fingers) | Expand particle clusters and shield |
| Move hand faster | Increase audio gain and particle wave amplitude |

### Mouse Fallback (no webcam)

| Input | Action |
|-------|--------|
| Move mouse | Position the particle core (with smooth dampening) |
| OrbitControls | Click + drag to rotate camera, scroll to zoom |

### UI Panel

- **Audio Engine** ? Toggle polyphonic synthesis on/off
- **Physics Engine** ? Toggle Cannon-es rigid body simulation
- **Particle Glow** ? Toggle custom bloom shader
- **Hologram Shield** ? Toggle wireframe icosahedron shell
- **Shape Selector** ? Switch between 15+ procedural layouts
- **Color Picker** ? Change active particle and shield color
- **Performance Mode** ? Adjust vertex count (800-8,000)
- **Record / Playback** ? Capture and replay gesture sequences
- **Export** ? Download simulation data as JSON

## Project Structure

```
neural-particle-sandbox/
??? index.html              # Entry point, importmap, UI panel markup
??? css/
?   ??? style.css           # Glassmorphism panel, responsive layout
??? js/
?   ??? App.js              # Main loop, state management, engine orchestration
?   ??? shapes.js           # Procedural vertex layout generators
?   ??? modules/
?       ??? CameraEngine.js   # MediaPipe integration, mouse fallback, gesture parsing
?       ??? ParticleEngine.js # Buffer geometry, custom shaders, morph targets
?       ??? PhysicsEngine.js  # Cannon-es world, attraction forces, rigid bodies
?       ??? AudioEngine.js    # Web Audio polyphonic synth, filter sweeps
?       ??? UiEngine.js       # Gesture recording, playback, state serialization
??? LICENSE
```

## License

MIT

## Author

Monish M
