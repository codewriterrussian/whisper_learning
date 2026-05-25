<!-- Language Switcher -->
<p align="right">
  <a href="./README_en.md">English</a> |
  <a href="./README.md">繁體中文</a>
</p>

# Whisper Speaking Practice

Local-first pronunciation practice app for recording speech, checking with OpenAI Whisper, and getting word accuracy / fluency feedback.

## Start Here

- New users English: [README_BEGINNER.md](README_BEGINNER.md)
- 新使用者繁體中文: [README_BEGINNER_zh-TW.md](README_BEGINNER_zh-TW.md)
- Full technical English docs: [README_en.md](README_en.md)

## What It Does

- Listen to model audio.
- Record your voice.
- Check speech with OpenAI Whisper.
- Compare the target sentence and transcript.
- Show word accuracy, timing, feedback, and practice history.
- Optionally compare with Apple STT on macOS.

## Quick Start

### macOS

1. Double-click `setup_mac.command` once.
2. Double-click `run_mac.command`.
3. If the browser does not open, open `http://localhost:6173`.

### Windows

1. Right-click `setup_windows.ps1` and choose **Run with PowerShell**.
2. Double-click `run_windows.bat`.

## Default Behavior

| Platform | Default provider | Default device |
| --- | --- | --- |
| Apple Silicon macOS | OpenAI Whisper + Apple STT comparison | MPS |
| Intel macOS | OpenAI Whisper + Apple STT comparison | CPU |
| Windows | OpenAI Whisper only | CPU |
| Linux | OpenAI Whisper only | CPU |

Default Whisper backend: OpenAI Whisper

Default Whisper model: `large-v3-turbo`

## macOS Apple STT Permission

Apple STT is optional and experimental. Whisper remains the main scoring provider.

Browser microphone permission is different from macOS Speech Recognition permission.

Permission path:

```text
System Settings → Privacy & Security → Speech Recognition
```

Enable the app that launched the backend:

- Terminal for double-click `run_mac.command` / Terminal.
- Visual Studio Code for VS Code terminal.
- PyCharm for PyCharm terminal.

After changing permission, restart `run_mac.command`.

Optional check:

```bash
./scripts/check_apple_stt.sh
```

## Performance Note

Apple Silicon MPS was much faster than CPU on the tested local machine, but actual speed depends on hardware, audio length, model cache state, and Python/PyTorch versions.

## Privacy

- Recordings are processed locally by default.
- Generated recordings, transcripts, and run results should not be committed.
- Optional Colab mode sends audio to a remote runtime and should not be used for private recordings.

## More Documentation

- [Full technical English docs](README_en.md)
- [Beginner guide English](README_BEGINNER.md)
- [初學者繁體中文指南](README_BEGINNER_zh-TW.md)
- [Release notes](RELEASE_NOTES.md)
- [Manual QA checklist](MANUAL_QA.md)
