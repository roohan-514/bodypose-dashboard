#!/bin/bash
# BodyPose Observatory — Installation Script

set -e

echo "=== BodyPose Observatory Install ==="

# Check for Python
if command -v python3 &> /dev/null; then
    PY=python3
elif command -v python &> /dev/null; then
    PY=python
else
    echo "Error: Python is not installed."
    exit 1
fi

# Simple check
echo "Python found: $($PY --version)"

# Start server
echo ""
echo "Installation complete!"
echo "Run the dashboard:"
echo "  $PY -m http.server 8080"
echo "Then open: http://localhost:8080"
