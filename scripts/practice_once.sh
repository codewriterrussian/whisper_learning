#!/usr/bin/env bash
set -euo pipefail

VOICE="${VOICE:-nl-NL-ColetteNeural}"
LANGUAGE="${LANGUAGE:-Dutch}"
MODEL="${MODEL:-small}"
SECONDS_TO_RECORD="${SECONDS_TO_RECORD:-8}"
MIC_DEVICE="${MIC_DEVICE:-0}"

export VOICE LANGUAGE MODEL SECONDS_TO_RECORD MIC_DEVICE

./scripts/make_model_audio.sh targets/target.txt model_audio/target.mp3

echo "Playing model audio..."
afplay model_audio/target.mp3

echo "Now record yourself."
./scripts/record_mac.sh recordings/my_recording.wav

./scripts/transcribe.sh recordings/my_recording.wav transcripts

python scripts/compare.py
