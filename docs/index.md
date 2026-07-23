# BodyPose Observatory Documentation

## Overview
Real-time 3D human pose estimation and visualization dashboard powered by MediaPipe Pose Landmarker and Three.js.

## Quick Start
1. Serve the project: `python -m http.server 8080`
2. Open `http://localhost:8080`
3. Enable camera when prompted, or use Demo Mode

## Features
- [Main Dashboard](../index.html) — 3D pose visualization with 13 scenarios
- [Pose Fusion](../pose-fusion/index.html) — Dual-modal video + signal fusion

## Architecture
```
Webcam → MediaPipe Pose Landmarker → 33 landmarks → Three.js 3D Scene
                                              ↓
                                    Fall Detection / Vitals / Presence
```

## Deployment
- Docker: `docker compose up -d`
- Local: `python -m http.server 8080`
