#!/bin/bash
# BodyPose Observatory — Deployment Script

set -e

echo "=== BodyPose Observatory Deploy ==="

# Check for docker
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed."
    exit 1
fi

# Build and deploy
echo "Building Docker image..."
docker compose build

echo "Starting container..."
docker compose up -d

echo "Deployed! Open http://localhost:8080"
