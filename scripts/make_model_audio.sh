#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${1:-targets/target.txt}"
OUT_FILE="${2:-model_audio/target.mp3}"
VOICE="${VOICE:-nl-NL-ColetteNeural}"
PYTHON_BIN="${PYTHON:-python}"

mkdir -p "$(dirname "$OUT_FILE")"

"$PYTHON_BIN" -m edge_tts \
  --voice "$VOICE" \
  --file "$TARGET_FILE" \
  --write-media "$OUT_FILE"

echo "Model audio saved to: $OUT_FILE"
