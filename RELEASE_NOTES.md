# Release Notes

## 0.1.0

Initial source-based public release candidate.

- Local web app for pronunciation practice with target audio, recording attempts, trimming, STT scoring, feedback, history, and report export.
- Whisper is the primary and recommended STT backend.
- Whisper Large is the default model; Large Turbo and Medium are optional.
- macOS defaults to Whisper + Apple STT comparison.
- Windows defaults to Whisper-only mode.
- Linux supports Whisper-only mode.
- Web checks are stored under `runs/<attemptId>/result.json`.
- Generated runtime files are ignored by Git.
