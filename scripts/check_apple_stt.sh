#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Apple STT is macOS-only. OpenAI Whisper still works on this platform."
  exit 0
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="$PYTHON"
elif [[ -x "$ROOT/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "Python was not found. Run setup_mac.command first."
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg was not found. Run setup_mac.command first."
  exit 1
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc was not found. Install Xcode Command Line Tools for Apple STT."
  echo "OpenAI Whisper still works without Apple STT."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

TEST_WAV="$TMP_DIR/apple_stt_permission_check.wav"

echo "Creating a temporary one-second test audio file..."
ffmpeg -y -f lavfi -i "sine=frequency=880:duration=1" -ar 16000 -ac 1 "$TEST_WAV" >/dev/null 2>&1

echo "Running Apple STT permission check..."
set +e
OUTPUT="$("$PYTHON_BIN" scripts/stt_model.py "$TEST_WAV" --stt-provider apple --language en --no-preprocess 2>&1)"
STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  echo "Apple STT helper ran without a macOS abort."
  echo "Transcript may be empty for this synthetic tone; this check is mainly for helper and Speech Recognition permission."
  exit 0
fi

echo "$OUTPUT"
echo
if grep -Eiq "aborted by macOS|Speech Recognition|permission|not authorized|rejected the helper identity" <<<"$OUTPUT"; then
  echo "Apple STT appears blocked by macOS Speech Recognition permission."
  echo "Open System Settings -> Privacy & Security -> Speech Recognition."
  echo "Enable the app used to launch the backend: Terminal, iTerm, PyCharm, VS Code, or run_mac.command."
  echo "Then restart run_mac.command."
  echo "OpenAI Whisper still works and remains the main scoring provider."
  exit 2
fi

echo "Apple STT check failed for another reason. OpenAI Whisper still works."
exit "$STATUS"
