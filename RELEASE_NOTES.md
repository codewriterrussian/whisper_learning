# Release Notes

## 0.1.0

Initial source-based public release candidate.

- Local web app for pronunciation practice with target audio, recording attempts, trimming, STT scoring, feedback, history, and report export.
- Whisper is the primary and recommended STT backend.
- `large-v3-turbo` is the default Whisper model; `large` and `medium` remain available as alternatives.
- macOS defaults to Whisper + Apple STT comparison.
- macOS Apple Silicon defaults OpenAI Whisper to MPS for faster local scoring. Intel macOS, Windows, and Linux default to CPU.
- Apple STT is macOS-only, optional, and experimental. If macOS Speech Recognition permission blocks Apple STT, the UI shows a non-fatal warning and Whisper scoring continues.
- Setup and System Check validate FFmpeg with `ffmpeg -version` and provide platform-specific install commands.
- Windows defaults to Whisper-only mode with CPU unless the user explicitly configures another supported device.
- Linux supports Whisper-only mode.
- Web checks are stored under `runs/<attemptId>/result.json`.
- Generated runtime files are ignored by Git, including frontend build output, runs, recordings, transcripts, results, model audio, generated reports, Python caches, npm dependencies, and Apple STT helper build output.
