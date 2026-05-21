#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="$PYTHON"
elif [[ -x "/Users/bladeruuner/opt/anaconda3/envs/stt_whisper/bin/python" ]]; then
  PYTHON_BIN="/Users/bladeruuner/opt/anaconda3/envs/stt_whisper/bin/python"
elif [[ -x "$HOME/opt/anaconda3/envs/stt_whisper/bin/python" ]]; then
  PYTHON_BIN="$HOME/opt/anaconda3/envs/stt_whisper/bin/python"
elif [[ -x "$HOME/miniforge3/envs/stt_whisper/bin/python" ]]; then
  PYTHON_BIN="$HOME/miniforge3/envs/stt_whisper/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  PYTHON_BIN=""
fi

if [[ -z "$PYTHON_BIN" || ! -x "$PYTHON_BIN" ]]; then
  echo "[ERROR] Python not found: $PYTHON_BIN"
  echo "Set PYTHON manually, for example:"
  echo "PYTHON=/path/to/python ./run_web_app.sh"
  exit 1
fi

export PYTHON="$PYTHON_BIN"
export WHISPER_MODEL="${WHISPER_MODEL:-large}"
export WHISPER_DEVICE="${WHISPER_DEVICE:-auto}"
export WHISPER_WARMUP="${WHISPER_WARMUP:-1}"
export WHISPER_RETRY_DEVICE="${WHISPER_RETRY_DEVICE:-same}"
export STT_LANGUAGE_AUTO_OVERRIDE="${STT_LANGUAGE_AUTO_OVERRIDE:-1}"
export BACKEND_PORT="${BACKEND_PORT:-6174}"
export FRONTEND_PORT="${FRONTEND_PORT:-6173}"
export FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:${BACKEND_PORT}}"

check_python_dependencies() {
  local missing

  if ! missing="$("$PYTHON" - <<'PY'
import importlib

required = ["rapidfuzz", "whisper", "numpy", "scipy", "soundfile", "torch"]
missing = []

for module_name in required:
    try:
        importlib.import_module(module_name)
    except Exception:
        missing.append(module_name)

print(" ".join(missing))
PY
)"; then
    echo "[ERROR] Python dependency check failed."
    echo "[ERROR] Python in use: $PYTHON"
    echo
    echo "Fix option 1:"
    echo "PYTHON=/Users/bladeruuner/opt/anaconda3/envs/stt_whisper/bin/python ./run_web_app.sh"
    echo
    echo "Fix option 2:"
    echo "$PYTHON -m pip install -r requirements.txt"
    exit 1
  fi

  if [[ -n "$missing" ]]; then
    echo "[ERROR] Missing Python dependencies: $missing"
    echo "[ERROR] Python in use: $PYTHON"
    echo
    echo "Fix option 1:"
    echo "PYTHON=/Users/bladeruuner/opt/anaconda3/envs/stt_whisper/bin/python ./run_web_app.sh"
    echo
    echo "Fix option 2:"
    echo "$PYTHON -m pip install -r requirements.txt"
    exit 1
  fi

  echo "[INFO] Python dependency check passed."
}

echo "[INFO] Using Python: $PYTHON"
echo "[INFO] Using Whisper model: $WHISPER_MODEL"
echo "[INFO] Using Whisper device: $WHISPER_DEVICE"
echo "[INFO] Whisper warmup: $WHISPER_WARMUP"
echo "[INFO] Whisper retry device policy: $WHISPER_RETRY_DEVICE"
echo "[INFO] STT language auto override: $STT_LANGUAGE_AUTO_OVERRIDE"
echo "[INFO] Frontend port: $FRONTEND_PORT"
echo "[INFO] Backend port: $BACKEND_PORT"

check_python_dependencies

require_free_port() {
  local port="$1"
  local label="$2"

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/tmp/whisper_learning_port_"$port".txt 2>/dev/null; then
    echo "[ERROR] $label port $port is already in use:"
    cat /tmp/whisper_learning_port_"$port".txt
    echo
    echo "Stop that process first, for example:"
    echo "kill <PID>"
    exit 1
  fi
}

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "[ERROR] ffmpeg is required but not found."
  echo "Install it with: brew install ffmpeg, sudo apt install ffmpeg, or your distro package manager."
  exit 1
fi

require_free_port "$BACKEND_PORT" "Backend"
require_free_port "$FRONTEND_PORT" "Frontend"

if [[ ! -d backend/node_modules ]]; then
  echo "[INFO] Installing backend dependencies..."
  (cd backend && npm install)
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "[INFO] Installing frontend dependencies..."
  (cd frontend && npm install)
fi

cleanup() {
  echo "[INFO] Stopping servers..."
  for job in $(jobs -p); do
    kill "$job" 2>/dev/null || true
  done
}
trap cleanup EXIT

(cd backend && PORT="$BACKEND_PORT" npm run dev) &
(cd frontend && FRONTEND_HOST="$FRONTEND_HOST" FRONTEND_PORT="$FRONTEND_PORT" npm run dev) &

wait
