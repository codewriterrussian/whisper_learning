#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ -z "${WHISPER_DEVICE:-}" ]]; then
  if [[ "$(uname -m)" == "arm64" ]]; then
    export WHISPER_DEVICE="mps"
  else
    export WHISPER_DEVICE="cpu"
  fi
fi

say_step() {
  printf "\n== %s ==\n" "$1"
}

stop_with_help() {
  printf "\nSetup stopped: %s\n" "$1"
  printf "%s\n" "$2"
  printf "\nAfter fixing this, double-click setup_mac.command again.\n"
  read -r -p "Press Return to close this window..."
  exit 1
}

say_step "Whisper Speaking Practice setup"
echo "This will check your computer and install the app's local dependencies."

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  say_step "Installing Python"
  if ! command -v brew >/dev/null 2>&1; then
    stop_with_help "Python is missing." "Install Homebrew from https://brew.sh/ and then double-click setup_mac.command again."
  fi
  brew install python || stop_with_help "Python could not be installed." "Homebrew failed while installing Python. Try opening Terminal here and running: brew install python"
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python)"
  else
    stop_with_help "Python was installed but is not available." "Close this window, open a new Terminal, and run: brew install python"
  fi
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  stop_with_help "Node.js/npm is missing." "Please install Node.js LTS from https://nodejs.org/"
fi

check_ffmpeg() {
  command -v ffmpeg >/dev/null 2>&1 && ffmpeg -version >/dev/null 2>&1
}

if ! check_ffmpeg; then
  say_step "Installing FFmpeg"
  if ! command -v brew >/dev/null 2>&1; then
    stop_with_help "FFmpeg is required but was not found." "Please install Homebrew from https://brew.sh, then run: brew install ffmpeg
After that, re-run setup_mac.command."
  fi
  brew install ffmpeg || stop_with_help "FFmpeg could not be installed." "Homebrew failed while installing FFmpeg. Try opening Terminal here and running: brew install ffmpeg"
  check_ffmpeg || stop_with_help "FFmpeg was installed but is not available." "Close this window, open a new Terminal, run: brew install ffmpeg, then re-run setup_mac.command."
fi

say_step "Creating app folders"
mkdir -p recordings/uploads recordings/processed_audio targets transcripts results model_audio runs generated_reports

say_step "Creating Python environment"
"$PYTHON_BIN" -m venv "$ROOT/.venv" || stop_with_help "Python environment could not be created." "Try opening Terminal here and running: python3 -m venv .venv"
VENV_PYTHON="$ROOT/.venv/bin/python"

say_step "Installing Python packages"
echo "This may take a while. Whisper may download a model the first time you check a recording."
"$VENV_PYTHON" -m pip install -U pip || stop_with_help "pip could not be upgraded." "Try opening Terminal here and running: .venv/bin/python -m pip install -U pip"
"$VENV_PYTHON" -m pip install -r requirements.txt || stop_with_help "Python packages could not be installed." "Try opening Terminal here and running: .venv/bin/python -m pip install -r requirements.txt"
export PYTHON="$VENV_PYTHON"

if [ ! -f "$ROOT/backend/package.json" ]; then
  stop_with_help "Backend package.json is missing." "Expected to find $ROOT/backend/package.json"
fi

if [ ! -f "$ROOT/frontend/package.json" ]; then
  stop_with_help "Frontend package.json is missing." "Expected to find $ROOT/frontend/package.json"
fi

say_step "Installing backend packages"
( cd "$ROOT/backend" || exit 1; npm install ) || stop_with_help "Backend packages could not be installed." "npm failed inside backend."

say_step "Installing frontend packages"
( cd "$ROOT/frontend" || exit 1; npm install ) || stop_with_help "Frontend packages could not be installed." "npm failed inside frontend."

say_step "Running system check"
node scripts/doctor.js || true

printf "\nSetup finished.\n"
printf "Next: double-click run_mac.command to start the app.\n"
read -r -p "Press Return to close this window..."
