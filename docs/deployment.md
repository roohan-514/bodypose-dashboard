# Deployment Guide

## Local Development
```bash
python -m http.server 8080
# or
npx serve .
```

## Docker Deployment
```bash
docker compose up -d
# Open http://localhost:8080
```

## Requirements
- Modern browser (Chrome 90+, Edge 90+, Firefox 90+, Safari 15+)
- Webcam (optional — demo mode works without one)
- Camera access requires HTTPS or localhost
