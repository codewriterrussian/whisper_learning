#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

export BACKEND_PORT="${BACKEND_PORT:-6174}"
export FRONTEND_PORT="${FRONTEND_PORT:-6173}"
export FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:${BACKEND_PORT}}"
export WHISPER_MODEL="${WHISPER_MODEL:-large-v3-turbo}"
export WHISPER_DEVICE="${WHISPER_DEVICE:-auto}"
export WHISPER_WARMUP="${WHISPER_WARMUP:-0}"
export STT_LANGUAGE_AUTO_OVERRIDE="${STT_LANGUAGE_AUTO_OVERRIDE:-0}"

if command -v python3 >/dev/null 2>&1; then
  export PYTHON="${PYTHON:-$(command -v python3)}"
elif command -v python >/dev/null 2>&1; then
  export PYTHON="${PYTHON:-$(command -v python)}"
fi

echo "App is starting..."
echo "You can close this window to stop the app."
echo

if [[ ! -d backend/node_modules || ! -d frontend/node_modules ]]; then
  echo "The app is not set up yet. Please double-click setup_mac.command first."
  read -r -p "Press Return to close this window..."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is missing. This app needs FFmpeg to process your audio."
  echo "Run setup_mac.command for help."
  read -r -p "Press Return to close this window..."
  exit 1
fi

cleanup() {
  echo "Stopping app..."
  for job in $(jobs -p); do
    kill "$job" 2>/dev/null || true
  done
}
trap cleanup EXIT

(cd backend && PORT="$BACKEND_PORT" npm run dev) &
(cd frontend && FRONTEND_HOST="$FRONTEND_HOST" FRONTEND_PORT="$FRONTEND_PORT" npm run dev) &

sleep 3
open "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1 || true

wait
