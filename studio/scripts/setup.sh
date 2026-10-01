#!/usr/bin/env bash
# Run once at the start of each session (the container is fresh every time).
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
pip install -q numpy librosa scenedetect opencv-python-headless
mkdir -p media/refs media/rushes media/out public/media
echo "Studio ready."
