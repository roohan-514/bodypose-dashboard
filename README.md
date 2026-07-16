# π BodyPose Observatory

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-amd64%20%2B%20arm64-blue.svg)](Dockerfile)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e.svg)](app.js)
[![Three.js](https://img.shields.io/badge/Three.js-r160-049ef4.svg)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose%20Landmarker-00c853.svg)](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)

**Real-time 3D human pose estimation and visualization dashboard** — powered by MediaPipe Pose Landmarker and Three.js. Detects up to 6 people via webcam with a sci-fi observatory 3D scene, 13 simulation scenarios, vital signs monitoring, and fall detection.

> Live demo: Open `index.html` in a browser with webcam access (or use the built-in demo mode).

---

## Quick Start

```bash
# Option 1: Python
python -m http.server 8080

# Option 2: Docker
docker compose up -d

# Option 3: Node.js
npx serve .

# Open http://localhost:8080
```

---

## Features

### Main Dashboard (`index.html`)
- **Live Camera Pose Detection** — detects up to 6 people via webcam using MediaPipe's pose landmarker
- **3D Skeleton Rendering** — realistic sci-fi observatory scene with bloom, fog, and orbital camera controls
- **13 Simulation Scenarios** — auto-cycles or manually select scenarios
- **Real-time Vitals HUD** — heart rate (BPM), respiration (RPM), detection confidence %
- **People Counting** — visual dot indicators + sparkline history
- **Presence Detection** — PRESENT / ABSENT / FALL DETECTED states
- **Fall Alert** — automatic fall detection using hip-to-nose height ratio
- **Adjustable Settings** — bloom, exposure, vignette, grain, bone thickness, joint size, etc.
- **7 Visual Presets** — Foundation, Cinematic, Minimal, Neon, Tactical, Medical
- **Demo Generator** — simulates poses when no camera is available

### Pose Fusion (`pose-fusion/`)
- **Dual-Modal Architecture** — fuses webcam video pose with simulated CSI signal data
- **Three Operation Modes** — Dual Mode, Video Only, Simulated Only
- **Fusion Confidence Display** — per-modality confidence bars + cross-modal similarity score
- **Signal Amplitude Heatmap** — real-time 2D heatmap visualization
- **RSSI Signal Strength** — simulated dBm gauge with quality rating and sparkline history

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [MediaPipe Pose Landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker) | Real-time body landmark detection (33 keypoints) |
| [Three.js](https://threejs.org/) | 3D rendering engine with post-processing |
| [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) | Interactive 3D camera (pan, zoom, rotate) |
| Vanilla JS (ES Modules) | Zero-framework frontend |
| Canvas 2D API | Skeleton overlay, heatmaps, sparkline charts |

---

## Project Structure

```
bodypose-dashboard/
├── index.html              # Main observatory dashboard
├── app.js                  # 3D scene, pose detection, effects, UI
├── style.css               # Dashboard styles
├── pose-fusion/            # Dual-modal fusion dashboard
│   ├── index.html
│   ├── js/main.js
│   └── css/style.css
├── docs/                   # Documentation
│   ├── index.md
│   └── deployment.md
├── assets/                 # Project assets
├── Dockerfile              # Docker deployment
├── docker-compose.yml      # Docker compose
├── Makefile                # Build/run commands
├── CHANGELOG.md            # Version history
├── CLAUDE.md               # AI development guide
├── LICENSE                 # MIT license
├── README.md               # This file
├── requirements.txt        # Python dependencies
├── pyproject.toml          # Python project config
├── example.env             # Environment template
├── deploy.sh               # Deployment script
└── install.sh              # Installation script
```

---

## How It Works

### Pose Detection Pipeline
1. Webcam feed captured via `getUserMedia()`
2. MediaPipe Pose Landmarker detects 33 body landmarks per person
3. Landmarks transformed into 3D world coordinates
4. Skeleton rendered as sci-fi observatory scene with bloom and fog
5. Vital signs (HR, BR) simulated based on presence and scenario

### Fall Detection Algorithm
- Monitors vertical distance between nose and average hip position
- If height drops below threshold + hips elevated → fall alert
- Falls affect simulated vital signs (HR drops, BR slows)

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

## Browser Support

- Chrome 90+
- Edge 90+
- Firefox 90+
- Safari 15+ (limited WebGL 2 support)

---

## License

MIT — see [LICENSE](LICENSE)

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) by Google for pose estimation
- [Three.js](https://threejs.org/) community for the 3D engine
- Inspired by RF-based pose estimation research (WiFi sensing, through-wall radar)
