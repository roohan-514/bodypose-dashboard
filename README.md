# BodyPose Observatory

Real-time 3D human pose estimation and visualization dashboard powered by **MediaPipe Pose Landmarker** and **Three.js**.

> Live demo: Open `index.html` in a browser with webcam access (or use the built-in demo mode).

---

## Features

### Main Dashboard (`index.html`)
- **Live Camera Pose Detection** — detects up to 6 people via webcam using MediaPipe's pose landmarker
- **3D Skeleton Rendering** — realistic sci-fi observatory scene with bloom, fog, and orbital camera controls
- **13 Simulation Scenarios** — auto-cycles or manually select scenarios:
  | Scenario | Description |
  |---|---|
  | Auto-Cycle | Rotates through all scenarios automatically |
  | Empty Room | No persons detected |
  | Vital Signs | Breathing pattern simulation with heart/respiration display |
  | Multi-Person | Tracks two persons walking |
  | Fall Detect | Detects fall events based on pose geometry |
  | Sleep Monitor | Apnea-tracking scenario |
  | Intrusion | Unauthorized presence alert |
  | Gesture Ctrl | Gesture recognition simulation |
  | Crowd (4 ppl) | Occupancy counting demo |
  | Search Rescue | Through-wall detection simulation |
  | Elderly Care | Gait analysis monitoring |
  | Fitness | Exercise tracking |
  | Security Patrol | Perimeter monitoring |
- **Real-time Vitals HUD** — heart rate (BPM), respiration (RPM), detection confidence %
- **People Counting** — visual dot indicators + sparkline history
- **Presence Detection** — shows PRESENT / ABSENT / FALL DETECTED states
- **Fall Alert** — automatic fall detection using hip-to-nose height ratio
- **Adjustable Settings** — bloom, exposure, vignette, grain, bone thickness, joint size, wireframe/color, signal field opacity, pulse waves, FOV, orbit speed
- **7 Visual Presets** — Foundation, Cinematic, Minimal, Neon, Tactical, Medical
- **Keyboard Shortcuts** — `D` cycle scenario, `S` settings, `A` reset camera, `F` toggle FPS
- **Demo Generator** — simulates poses when no camera is available

### Pose Fusion (`pose-fusion/`)
- **Dual-Modal Architecture** — fuses webcam video pose estimation with simulated CSI (Channel State Information) signal data
- **Three Operation Modes**:
  - **Dual Mode** — video + simulated signal fusion
  - **Video Only** — webcam pose estimation alone
  - **Simulated Only** — synthetic pose data
- **Fusion Confidence Display** — per-modality confidence bars + cross-modal similarity score
- **Signal Amplitude Heatmap** — real-time 2D heatmap visualization
- **RSSI Signal Strength** — simulated dBm gauge with quality rating and sparkline history
- **Embedding Space** — 2D t-SNE-like projection of fused embeddings
- **Pipeline Latency** — per-stage timing (Video CNN, Signal CNN, Fusion, Total)
- **Confidence Threshold Slider** — adjustable detection sensitivity

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [MediaPipe Pose Landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker) | Real-time body landmark detection (33 keypoints) |
| [Three.js](https://threejs.org/) | 3D rendering engine with post-processing (bloom, vignette, chromatic aberration, film grain) |
| [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) | Interactive 3D camera (pan, zoom, rotate) |
| Vanilla JS (ES Modules) | Zero-framework frontend with import maps |
| Canvas 2D API | Skeleton overlay, heatmaps, sparkline charts |

---

## Getting Started

### Prerequisites
- A modern browser (Chrome, Edge, Firefox, Safari)
- Webcam (optional — demo mode works without one)

### Running
Simply serve the project root with any HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Then open `http://localhost:8080` in your browser.

> ⚠️ Camera access requires a secure context (`localhost` or `https`). Using `file://` protocol will not work for webcam features, but demo mode will activate automatically.

### Project Structure

```
bodypose-dashboard/
├── index.html           # Main observatory dashboard
├── app.js               # 3D scene, pose detection, effects, UI
├── style.css            # Dashboard styles
├── pose-fusion/
│   ├── index.html       # Dual-modal fusion dashboard
│   ├── js/main.js       # Fusion logic, 2D skeleton rendering
│   └── css/style.css    # Fusion dashboard styles
└── README.md
```

---

## How It Works

### Pose Detection Pipeline
1. Webcam feed is captured via `getUserMedia()`
2. Each frame is passed to MediaPipe's `PoseLandmarker.detectForVideo()`
3. Returns 33 body landmarks (x, y, z, visibility) per detected person
4. Landmarks are transformed into 3D world coordinates and rendered as a skeleton
5. Vital signs (HR, BR) are simulated based on presence and scenario

### Fall Detection Algorithm
- Monitors the vertical distance between nose (landmark 0) and average hip position (landmarks 23, 24)
- If height drops below threshold AND hips are elevated → triggers fall alert
- Falls affect simulated vital signs (HR drops, BR slows)

### Dual-Modal Fusion (Pose Fusion)
- Video stream provides visual pose landmarks
- Simulated CSI data provides RF-based pose estimation
- Both modalities are fused with a weighted average
- Cross-modal similarity score measures agreement between video and signal estimates
- All metrics are simulated for demonstration purposes

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `D` | Cycle to next scenario |
| `S` | Toggle settings panel |
| `A` | Reset camera position |
| `F` | Toggle FPS counter |
| `Space` | Pause simulation |

---

## Settings Reference

### Rendering
| Setting | Range | Default | Description |
|---|---|---|---|
| Bloom Strength | 0–3 | 1.0 | Glow intensity on bright elements |
| Bloom Radius | 0–1 | 0.5 | Spread of bloom effect |
| Bloom Threshold | 0–1 | 0.25 | Minimum brightness for bloom |
| Exposure | 0.2–2 | 0.9 | Tone mapping exposure |
| Vignette | 0–1 | 0.5 | Darkening at screen edges |
| Film Grain | 0–0.15 | 0.03 | Analog noise effect |
| Chromatic Aberration | 0–0.008 | 0.0015 | Color fringe effect |

### Appearance
| Setting | Range | Default | Description |
|---|---|---|---|
| Bone Thickness | 1–8 | 3 | Skeleton limb width |
| Joint Size | 0.02–0.12 | 0.05 | Keypoint sphere radius |
| Glow Intensity | 0–2 | 0.6 | Skeleton glow amplitude |
| Wireframe Color | hex | #00d4ff | Skeleton bone color |
| Joint Color | hex | #00ffaa | Keypoint color |

### Scene
| Setting | Range | Default | Description |
|---|---|---|---|
| Signal Field | 0–1 | 0.5 | Floor grid visibility |
| Pulse Waves | 0–1 | 0.6 | WiFi wave visibility |
| FOV | 30–90 | 50 | Camera field of view |
| Orbit Speed | 0.02–0.5 | 0.15 | Camera rotation sensitivity |

---

## Browser Support

- Chrome 90+
- Edge 90+
- Firefox 90+
- Safari 15+ (limited WebGL 2 support)

---

## License

MIT

---

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) by Google for pose estimation
- [Three.js](https://threejs.org/) community for the 3D engine
- Inspired by RF-based pose estimation research (WiFi sensing, through-wall radar)
