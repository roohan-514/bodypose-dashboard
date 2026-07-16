# BodyPose Observatory — CLAUDE.md

## Project Overview
Real-time 3D human pose estimation and visualization dashboard powered by MediaPipe Pose Landmarker and Three.js. Detects up to 6 people via webcam, renders 3D skeletons, and provides 13 simulation scenarios for vital signs, fall detection, sleep monitoring, and more.

## Tech Stack
- MediaPipe Pose Landmarker — real-time body landmark detection (33 keypoints)
- Three.js — 3D rendering with post-processing (bloom, vignette, chromatic aberration, film grain)
- OrbitControls — interactive 3D camera
- Vanilla JS (ES Modules) — zero-framework frontend
- Canvas 2D API — skeleton overlay, heatmaps, sparkline charts

## Project Structure
```
bodypose-dashboard/
├── index.html             # Main observatory dashboard
├── app.js                 # 3D scene, pose detection, effects, UI
├── style.css              # Dashboard styles
├── pose-fusion/           # Dual-modal fusion dashboard
│   ├── index.html
│   ├── js/main.js
│   └── css/style.css
├── docs/                  # Documentation
├── assets/                # Images and resources
├── Dockerfile             # Docker deployment
├── docker-compose.yml     # Docker compose
├── Makefile               # Build/run commands
├── CHANGELOG.md           # Version history
├── CLAUDE.md              # AI instructions
└── README.md              # Project documentation
```

## Commands
```bash
# Serve locally
python -m http.server 8080
# or
npx serve .

# Docker
docker compose up -d

# Open http://localhost:8080
```

## Key Features
- Live camera pose detection (up to 6 people)
- 3D skeleton rendering with sci-fi observatory scene
- 13 simulation scenarios
- Real-time vitals HUD
- Fall detection algorithm
- 7 visual presets
- Keyboard shortcuts: D (scenario), S (settings), A (reset camera), F (FPS)
- Demo generator (works without camera)
- Dual-modal pose fusion dashboard
