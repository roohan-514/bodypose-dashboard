# π BodyPose Observatory v2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-amd64%20%2B%20arm64-blue.svg)](Dockerfile)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f7df1e.svg)](app.js)
[![Three.js](https://img.shields.io/badge/Three.js-r160-049ef4.svg)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose%20Landmarker-00c853.svg)](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-00e5ff.svg)](server.js)
[![REST API](https://img.shields.io/badge/API-RESTful-00ff88.svg)](server.js)

**Real-time 3D human pose estimation and visualization dashboard** — powered by MediaPipe Pose Landmarker and Three.js. Features a full-stack Node.js backend with WebSocket streaming, REST API, pose recording/playback, JSON/CSV export, and live analytics.

> Live demo: Run `node server.js` and open `http://localhost:3000` in a browser with webcam access (or use the built-in demo mode).

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the full-stack server (WebSocket + REST API + static files)
node server.js

# Or use Docker
docker compose up -d

# Open http://localhost:3000
```

## New in v2

| Feature | Description |
|---|---|
| **Node.js Backend** | Express server with WebSocket real-time streaming |
| **REST API** | Endpoints for pose data, recordings, export, and status |
| **Pose Recording** | Record and save pose sessions to disk |
| **JSON / CSV Export** | Download recorded data for analysis |
| **Analytics Dashboard** | Historical charts for people count, vitals, confidence |
| **WebSocket Streaming** | Live pose data broadcast to all connected clients |
| **Live Charts** | Real-time Chart.js visualizations

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
├── server.js               # Node.js backend (Express + WebSocket + API)
├── package.json            # Backend dependencies
├── recordings/             # Saved recording sessions
├── index.html              # Main observatory dashboard
├── app.js                  # 3D scene, pose detection, effects, UI, WS client
├── style.css               # Dashboard styles
├── analytics.html          # Analytics dashboard with live charts
├── pose-fusion/            # Dual-modal fusion dashboard
│   ├── index.html
│   ├── js/main.js
│   └── css/style.css
├── docs/                   # Documentation
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
