#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="${1:-recordings/my_recording.wav}"
SECONDS_TO_RECORD="${SECONDS_TO_RECORD:-10}"
MIC_DEVICE="${MIC_DEVICE:-0}"

mkdir -p "$(dirname "$OUT_FILE")"

echo "Recording for ${SECONDS_TO_RECORD}s..."
ffmpeg -y -f avfoundation -i ":${MIC_DEVICE}" -t "$SECONDS_TO_RECORD" "$OUT_FILE"
echo "Recording saved to: $OUT_FILE"
