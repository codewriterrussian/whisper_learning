#!/usr/bin/env bash
set -euo pipefail

MODEL="${MODEL:-large-v3-turbo}"
DEVICE="${DEVICE:-auto}"
LANGUAGE="${LANGUAGE:-}"
STT_PROVIDER="${STT_PROVIDER:-whisper}"
FAST_MODE="${FAST_MODE:-1}"
POSITIONAL=()
OUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stt-provider)
      STT_PROVIDER="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --device)
      DEVICE="$2"
      shift 2
      ;;
    --language)
      LANGUAGE="$2"
      shift 2
      ;;
    --fast-mode)
      FAST_MODE="1"
      shift
      ;;
    --no-fast-mode)
      FAST_MODE="0"
      shift
      ;;
    --output)
      OUT_FILE="$2"
      shift 2
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

AUDIO_FILE="${POSITIONAL[0]:-recordings/my_recording.wav}"
OUT_DIR="${POSITIONAL[1]:-transcripts}"
OUT_FILE="${OUT_FILE:-$OUT_DIR/$(basename "${AUDIO_FILE%.*}").txt}"

mkdir -p "$OUT_DIR"

ARGS=("$AUDIO_FILE" "--stt-provider" "$STT_PROVIDER" "--model" "$MODEL" "--device" "$DEVICE" "--output" "$OUT_FILE")

if [[ -n "$LANGUAGE" ]]; then
  ARGS+=("--language" "$LANGUAGE")
fi

if [[ "$FAST_MODE" == "1" ]]; then
  ARGS+=("--fast-mode")
else
  ARGS+=("--no-fast-mode")
fi

python scripts/stt_model.py "${ARGS[@]}"

echo "Transcript saved in: $OUT_FILE"
