# Changelog

## [2.0.0] - 2026-07-16

### Added
- Full-stack Node.js backend (Express + WebSocket + REST API)
- Real-time pose data streaming via WebSocket
- Pose recording system — save sessions to disk with start/stop controls
- JSON and CSV export for recorded pose data
- Analytics dashboard with live Chart.js visualizations
- People count, heart rate, respiration, and confidence historical charts
- Recording session browser with view/export/delete actions
- Backend connection status indicator
- Auto-reconnect WebSocket client

### Changed
- `index.html` — added Record button, Analytics link, backend status badge
- `app.js` — integrated WebSocket client, pose streaming every 3rd frame
- `README.md` — updated for v2 with new features and server command

## [1.0.0] - 2026-07-16

### Added
- Initial release of BodyPose Observatory
- Live camera pose detection via MediaPipe Pose Landmarker (up to 6 people)
- 3D skeleton rendering with Three.js (bloom, fog, orbital controls)
- 13 simulation scenarios (Vital Signs, Fall Detect, Sleep Monitor, Intrusion, etc.)
- Real-time vitals HUD (heart rate BPM, respiration RPM, confidence %)
- People counting with visual dot indicators and sparkline history
- Fall detection algorithm using hip-to-nose height ratio
- Dual-Modal Pose Fusion dashboard (video + simulated CSI signal fusion)
- 7 visual presets (Foundation, Cinematic, Minimal, Neon, Tactical, Medical)
- Adjustable settings panel (bloom, exposure, vignette, grain, bone thickness, etc.)
- Keyboard shortcuts (D, S, A, F, Space)
- Demo generator for camera-free operation
- Docker support for easy deployment
- Responsive design for desktop and tablet
