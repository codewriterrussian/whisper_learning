# Whisper Speaking Practice

A local-first pronunciation practice app for listening to model audio, recording attempts, checking speech-to-text transcripts, scoring word accuracy, and reviewing fluency/timing feedback. This release is a source-based local tool, not a hosted production service.

Whisper is the default and recommended STT provider on every platform. Native system STT is optional and experimental:

- macOS: Apple Speech
- Windows: Windows Speech
- Linux: Whisper only

## Setup

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
npm --prefix backend install
npm --prefix frontend install
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
runs/<attemptId>/transcript.windows_speech.txt
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

Whisper remains the default provider. The default model is `large` because it is more reliable for Polish and multilingual speaking practice. `medium` is still available as a faster rough-check mode, and `large-v3-turbo` can be selected when your Whisper install supports it.

CLI example:

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider whisper \
  --language pl \
  --model large \
  --device auto \
  --fast-mode \
  --output transcripts/my_recording.txt
```

Shell helper:

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --language pl --model large --device auto
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

- Providers: Whisper, Apple Speech, Both
- Devices: `mps`, `cpu`, or `auto`
- `auto` prefers MPS when available

Windows:

- Providers: Whisper, Windows Speech, Both
- Devices: `cuda`, `cpu`, or `auto`
- `auto` prefers CUDA when available
- Windows Speech is experimental and depends on installed Windows Speech recognizers

Linux:

- Providers: Whisper only
- Devices: `cuda`, `cpu`, or `auto`
- `auto` prefers CUDA when available
- Native Apple/Windows STT options are hidden

MPS is never selected outside macOS. Native STT failures are reported with statuses such as `failed`, `unavailable`, `invalid`, or `skipped`; they are not shown as `0.0/100`.

## Apple Speech STT

Apple Speech is macOS-only and experimental. It uses Apple’s native Speech framework through a small Swift helper launched by Python. It may require Speech Recognition permission for the app that starts the backend, such as Terminal, iTerm, VS Code, or PyCharm.

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider apple \
  --language pl \
  --output transcripts/my_recording.txt
```

## Windows Speech STT

Windows Speech is Windows-only and experimental. It uses a PowerShell helper under `scripts/windows_speech_helper/` and requires a matching installed Windows Speech recognizer for the selected locale.

```powershell
python scripts/stt_model.py recordings/my_recording.wav `
  --stt-provider windows_speech `
  --language en `
  --output transcripts/my_recording.txt
```

## Both Provider Mode

On platforms with a native provider, `both` checks the same recording with Whisper and native STT in parallel:

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider both \
  --language pl \
  --model large \
  --device auto \
  --output transcripts/my_recording.txt
```

Outputs are provider-specific:

```text
transcripts/my_recording.whisper.txt
transcripts/my_recording.apple.txt
transcripts/my_recording.windows_speech.txt
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
| `PYTHON` | `python` or `python3` from `PATH` | Python executable for backend STT/TTS scripts. |
| `EDGE_TTS_PYTHON` | same as `PYTHON` | Python executable used for target audio generation. |
| `WHISPER_MODEL` | `large` | Default Whisper model. |
| `WHISPER_DEVICE` | `auto` | Whisper device: `auto`, `cpu`, `mps`, or `cuda`. |
| `WHISPER_WARMUP` | `1` in launcher scripts | Preload the Whisper model on backend startup. |
| `WHISPER_RETRY_DEVICE` | `same` | Use `same` or `cpu` for safer retry after invalid Whisper output. |
| `STT_LANGUAGE_AUTO_OVERRIDE` | unset | Set to `1` to override selected language when target text strongly indicates another language. |
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
- AMD GPUs on Windows generally fall back to CPU in this repo; Windows Speech can still be used as native comparison STT.

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
- Apple Speech and Windows Speech are experimental comparison providers.
- Windows Speech depends on installed Windows recognizers for the target locale.
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
RUN_WINDOWS_STT_SMOKE=1 python -m unittest tests.test_stt_providers.STTProviderTests.test_windows_speech_provider_smoke
```
