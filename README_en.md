<!-- Language Switcher -->
<p align="right">
  <a href="./README_en.md">English</a> |
  <a href="./README.md">繁體中文</a>
</p>

# Whisper Speaking Practice

A local-first pronunciation practice app for listening to model audio, recording attempts, checking speech-to-text transcripts, scoring word accuracy, and reviewing fluency/timing feedback. This release is a source-based local tool, not a hosted production service.

**New user? Start here: [README_BEGINNER.md](README_BEGINNER.md). It explains the app with double-click setup steps and no coding background required.**

Whisper is the recommended STT provider on every platform. Platform defaults are:

- Apple Silicon macOS: OpenAI Whisper + Apple STT comparison when supported, with Whisper on MPS by default.
- Intel macOS: OpenAI Whisper + Apple STT comparison when supported, with Whisper on CPU by default.
- Windows: OpenAI Whisper only, CPU by default.
- Linux: OpenAI Whisper only, CPU by default.
- Optional remote comparison: Google Colab GPU Whisper worker

## Setup

Beginner launchers are available at the repo root:

- macOS: double-click `setup_mac.command`. After setup finishes, double-click `run_mac.command`.
- Windows: right-click `setup_windows.ps1` and choose **Run with PowerShell**. After setup finishes, double-click `run_windows.bat`.

The setup launcher tries to install Python and FFmpeg if they are missing, creates `.venv`, upgrades pip, installs Python packages including `openai-whisper`, and installs backend/frontend npm packages. On macOS, automatic Python/FFmpeg install requires Homebrew. On Windows, automatic Python/FFmpeg install requires `winget`.

Whisper model files are downloaded automatically the first time the app needs them. This can take a while and needs enough disk space for the selected model.

### Whisper model and device defaults

OpenAI Whisper is the default local backend and the default model is `large-v3-turbo`. Apple Silicon Macs use MPS by default. Intel Macs, Windows, and Linux use CPU by default. Faster Whisper is not the default; old `faster-whisper` backend settings warn and fall back to OpenAI Whisper. MLX remains opt-in experimental only.

First launch or the first recording may be slower because Whisper downloads, loads, or warms the selected model/device. Later requests should be faster. In macOS Whisper + Apple STT comparison mode, Apple STT may return first while Whisper scoring arrives later.

If Windows blocks the setup script, open PowerShell and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then right-click `setup_windows.ps1` and choose **Run with PowerShell** again.

The rest of this section is for developer/manual setup.

Requirements:

- Python 3.10 or 3.11 recommended.
- Node.js 20 or newer recommended.
- `ffmpeg` available on `PATH`.
- Disk space for Whisper models. Approximate download sizes: `medium` ~1.5 GB, `large` / `large-v3` ~3 GB, `large-v3-turbo` ~1.5 GB.

Create a Python environment and install the Python dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
```

Install JavaScript dependencies:

```bash
(cd backend && npm install)
(cd frontend && npm install)
```

Install `ffmpeg`:

```bash
# macOS
brew install ffmpeg

# Windows
winget install Gyan.FFmpeg

# Ubuntu/Debian Linux
sudo apt update
sudo apt install ffmpeg
```

## Run The Web App

macOS/Linux:

```bash
./run_web_app.sh
```

Windows PowerShell:

```powershell
.\run_web_app.ps1
```

Open:

```text
http://localhost:6173
```

The backend runs on `http://localhost:6174`.

## Privacy And Local Data

Recordings are processed locally by the backend running on your machine. The app does not upload recordings to a hosted server by default. Browser recordings are saved in your browser storage for the local practice history, and backend run artifacts are saved under `runs/<attemptId>/`.

Each web check may create:

```text
runs/<attemptId>/original.webm
runs/<attemptId>/input.wav
runs/<attemptId>/input.auto_trimmed.wav
runs/<attemptId>/target.txt
runs/<attemptId>/transcript.txt
runs/<attemptId>/transcript.whisper.txt
runs/<attemptId>/transcript.apple.txt
runs/<attemptId>/transcript.colab_whisper.txt
runs/<attemptId>/comparison.txt
runs/<attemptId>/result.json
```

To clear local generated files and browser history, use the `Clear history and local runs` button in the Practice history panel. You can also run:

```bash
./scripts/clear_local_data.sh
```

On Windows:

```powershell
.\scripts\clear_local_data.ps1
```

## Whisper STT

OpenAI Whisper remains the default local provider. The default model is `large-v3-turbo` because it is a faster strict-check option for multilingual speaking practice when your Whisper install supports it. `medium` is still available as a faster rough-check mode, and `large` remains available for slower strict checks.

CLI example:

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider whisper \
  --language pl \
  --model large-v3-turbo \
  --device auto \
  --fast-mode \
  --output transcripts/my_recording.txt
```

Shell helper:

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --language pl --model large-v3-turbo --device auto
```

Fast mode is enabled by default for short practice recordings:

```text
beam_size=1
best_of=1
temperature=0
condition_on_previous_text=False
word_timestamps=False
```

Whisper models are cached by model name and device in the long-lived STT worker. To preload the model when the backend starts:

```bash
WHISPER_WARMUP=1 ./run_web_app.sh
```

If `large-v3-turbo` is not supported by your installed `openai-whisper` package, choose `Strict Check - Large` or update Whisper. The backend returns a clear model-load error instead of silently falling back to a different model.

## Platform Behavior

macOS Apple Silicon:

- Default provider mode: Whisper + Apple STT
- Providers: Whisper, Apple STT, Whisper + Apple STT
- Devices: `mps`, `cpu`, or `auto`
- `auto` prefers MPS when available

Windows:

- Default provider mode: Whisper only
- Providers: Whisper only, plus optional Colab Whisper when configured
- Devices: `cuda`, `cpu`, or `auto`
- `auto` prefers CUDA when available

Linux:

- Providers: Whisper only
- Devices: `cuda`, `cpu`, or `auto`
- `auto` prefers CUDA when available
- Native STT options are hidden

Optional Colab:

- Provider: Colab Whisper GPU - experimental
- Available on any local platform only when `COLAB_STT_URL` is configured
- Sends audio to your remote Colab runtime for Whisper transcription only
- Local app still handles recording, trimming, scoring, result JSON, history, and report export

MPS is never selected outside macOS. Native STT failures are reported with statuses such as `failed`, `unavailable`, `invalid`, or `skipped`; they are not shown as `0.0/100`.

## Apple STT

Apple STT is macOS-only and experimental. It uses Apple’s native Speech framework through a small Swift helper launched by Python. It may require Speech Recognition permission for the app that starts the backend, such as Terminal, iTerm, VS Code, or PyCharm.

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider apple \
  --language pl \
  --output transcripts/my_recording.txt
```

## Optional Google Colab GPU Whisper Worker

Colab Whisper is experimental and remote. The local app remains the default and recommended workflow. Use Colab only when you want to compare or speed up Whisper transcription with a temporary remote GPU runtime.

Audio is uploaded to the Colab runtime. Do not use this mode for private or sensitive recordings. Free Colab GPU availability is not guaranteed, sessions can disconnect, and the public URL changes each session.

The notebook uses a Cloudflare Quick Tunnel. Quick Tunnels create temporary `trycloudflare.com` URLs that proxy public traffic to the Flask service running on Colab localhost.

GitHub-friendly Colab link placeholder:

```text
https://colab.research.google.com/github/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/blob/main/notebooks/colab_whisper_worker.ipynb
```

Steps:

1. Open `notebooks/colab_whisper_worker.ipynb` in Google Colab.
2. Enable a GPU runtime.
3. Run all cells.
4. Copy the printed `/transcribe` public URL.
5. Set `COLAB_STT_URL` locally.
6. Start the local web app.
7. Open Advanced STT settings and choose `Colab Whisper GPU - experimental`.

macOS/Linux:

```bash
export COLAB_STT_URL="https://xxxxx/transcribe"
./run_web_app.sh
```

Windows PowerShell:

```powershell
$env:COLAB_STT_URL="https://xxxxx/transcribe"
.\run_web_app.ps1
```

Optional timeout override:

```bash
export COLAB_STT_TIMEOUT=120
```

The Colab worker endpoint accepts multipart audio plus optional `language`, `model`, and `fastMode` fields. It returns JSON with `status`, `transcript`, `model`, `device`, and `timeSec`. If the worker is missing, disconnected, times out, or returns invalid JSON, the app marks Colab Whisper as unavailable/failed and does not show a fake `0.0/100`.

If the notebook stops at `Starting Cloudflare tunnel...` and never prints a `trycloudflare.com` URL, rerun only the tunnel cell. First check the local worker health in Colab:

```python
requests.get("http://127.0.0.1:7860/health").json()
```

If local health works but no public URL appears, the issue is the Cloudflare tunnel step, not Whisper. If the notebook prints a `trycloudflare.com` URL but the public `/health` check temporarily fails with DNS or connection errors, wait 30-60 seconds and try the printed `COLAB_STT_URL` locally anyway. Quick Tunnel DNS can lag briefly after the URL is created. If it still fails locally, rerun only the tunnel cell to get a fresh temporary tunnel.

## Whisper + Apple STT Mode

On macOS, `both` checks the same recording with Whisper and Apple STT in parallel:

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider both \
  --language pl \
  --model large-v3-turbo \
  --device auto \
  --output transcripts/my_recording.txt
```

Outputs are provider-specific:

```text
transcripts/my_recording.whisper.txt
transcripts/my_recording.apple.txt
transcripts/my_recording.colab_whisper.txt
```

The web app stores each checked recording under:

```text
runs/<attemptId>/
runs/<attemptId>/result.json
```

Legacy fixed files under `recordings/`, `transcripts/`, and `results/` are kept for CLI workflows only.

Runtime files are ignored by Git. For public release builds, do not commit recordings, transcripts, model audio, generated reports, or `runs/` output.

## Configuration

Common environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PYTHON` | auto-detected by launcher | Python executable for backend STT/TTS scripts. `run_web_app.sh` prefers the local `stt_whisper` Conda environment when present. |
| `EDGE_TTS_PYTHON` | same as `PYTHON` | Python executable used for target audio generation. |
| `WHISPER_MODEL` | `large-v3-turbo` | Default OpenAI Whisper model. |
| `WHISPER_DEVICE` | `mps` on Apple Silicon macOS, otherwise `cpu` | Whisper device: `auto`, `cpu`, `mps`, or `cuda`. |
| `WHISPER_WARMUP` | `1` in launcher scripts | Preload the Whisper model on backend startup. |
| `WHISPER_RETRY_DEVICE` | `same` | Use `same` or `cpu` for safer retry after invalid Whisper output. |
| `COLAB_STT_URL` | unset | Public `/transcribe` URL from the optional Colab Whisper worker. |
| `COLAB_STT_TIMEOUT` | `120` | Timeout in seconds for remote Colab transcription. |
| `STT_LANGUAGE_AUTO_OVERRIDE` | `0` in launcher scripts | Keep the UI-selected STT language by default. Set to `1` to override selected language when target text strongly indicates another language. |
| `BACKEND_PORT` | `6174` | Backend port. |
| `FRONTEND_PORT` | `6173` | Frontend port. |
| `FRONTEND_HOST` | `127.0.0.1` | Frontend host binding. |
| `VITE_API_BASE` | `http://localhost:<BACKEND_PORT>` | Frontend API base URL. |
| `MAX_UPLOAD_MB` | `25` | Maximum accepted recording upload size. |

## Performance Expectations

Actual speed depends heavily on model, CPU/GPU, and whether the model is already warm.

- `medium`: faster rough checking, less reliable for Polish and multilingual pronunciation.
- `large`: default strict checking, more reliable, slower cold starts.
- `large-v3-turbo`: fastest strict option when supported by your Whisper package, usually much faster than `large`.
- Apple Silicon MPS can speed up Whisper on macOS, but CPU fallback remains supported.
- NVIDIA CUDA can speed up Whisper on Windows/Linux when the installed PyTorch build supports CUDA.
- AMD GPUs on Windows generally fall back to CPU in this repo.

## Practice Features

The web app keeps:

- Target audio generation and playback
- Up to 10 saved recording attempts
- Selected-attempt checking workflow
- Manual trimming and automatic silence trimming
- Whisper retry after invalid garbage transcripts
- Provider statuses and invalid transcript validation
- Word accuracy and Fluency / Timing Match
- Teacher feedback and practice history
- Export Practice Report

When checking is in progress, the right-side result panel shows staged progress for audio preparation, auto-trim, WAV conversion, Whisper, optional native STT, comparison, fluency/timing, feedback, and history saving. Backend logs include per-step timing and attempt IDs.

## Example Targets

English:

```text
Today I will practice speaking clearly, slowly, and with natural rhythm.
```

Polish:

```text
Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm.
```

Vietnamese:

```text
Hôm nay tôi luyện nói rõ ràng, chậm rãi và có nhịp điệu tự nhiên.
```

German:

```text
Heute übe ich deutliches Sprechen, langsames Tempo und natürlichen Rhythmus.
```

## Troubleshooting

macOS startup:

- macOS users can normally run `./run_web_app.sh`.
- The launcher prefers `PYTHON` if you set it, then the repo-local `.venv`, then common user-level Conda/Miniforge environment paths, then `python3` or `python` on `PATH`.
- If the wrong Python is selected, start with `PYTHON=/path/to/env/bin/python ./run_web_app.sh`.
- If dependencies are missing, the launcher stops early and prints the selected Python plus the missing packages.

Whisper model download is slow:

- First use downloads model weights. Keep the terminal open until the download completes.
- Use `large-v3-turbo` or `medium` for faster checks if strict Large is too slow.

MPS is unavailable:

- MPS is macOS Apple Silicon only.
- On Intel macOS, Windows, and Linux, use `auto` or `cpu`.

Apple Speech permission fails:

- Enable Speech Recognition permission for the app that launched the backend, not just the browser.
- Restart the backend after changing macOS permissions.

Microphone permission fails:

- Use `http://localhost:6173` or HTTPS; browser microphone APIs do not work on arbitrary insecure origins.
- Grant microphone permission in the browser and in OS privacy settings.

STT returns punctuation or an empty transcript:

- Whisper retries once with safer decoding settings.
- Invalid transcripts are hidden from the UI and ignored for scoring.
- Record again in a quieter place and check that the live waveform moves.

Browser points to the wrong backend URL:

- Set `VITE_API_BASE=http://localhost:<backend-port>` before starting the frontend.
- Make sure the backend terminal says `Backend running at http://localhost:<port>`.

## Limitations

- This is a local practice tool, not a clinical speech assessment system.
- STT scores measure whether an STT engine understood the words; they are not a complete pronunciation diagnosis.
- Apple STT is the only native comparison provider and is macOS-only.
- Colab Whisper is remote and experimental; audio leaves your computer when enabled.
- Docker is not currently a supported release target. Apple Speech and MPS should not be expected to work inside Docker.
- Browser and microphone behavior vary by OS and browser; use `MANUAL_QA.md` before publishing a release.

## Tests

Python tests:

```bash
python -m unittest tests.test_stt_providers
```

Backend storage tests:

```bash
npm --prefix backend test
```

Frontend build:

```bash
npm --prefix frontend run build
```

All standard checks:

```bash
./scripts/run_all_tests.sh
```

On Windows:

```powershell
.\scripts\run_all_tests.ps1
```

Optional native STT smoke tests:

```bash
RUN_APPLE_STT_SMOKE=1 python -m unittest tests.test_stt_providers.STTProviderTests.test_apple_provider_smoke
```
