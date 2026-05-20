# Codex Context: Git State for Cross-Platform Update

## Current Project

Repository folder:

```bash
~/PycharmProjects/whisper_learning
```

This folder has now been initialized as a Git repository.

Current Git status reported by terminal:

```bash
(base) bladeruuner@Yings-MacBook-Pro-9 whisper_learning % git add .
git status
On branch cross-platform-native-stt
nothing to commit, working tree clean
```

This means:

```text
- Git has already been initialized.
- The current working branch is cross-platform-native-stt.
- The current working tree is clean.
- There are no unstaged or staged changes before starting the next update.
```

## Important Rule for Codex

Do all cross-platform portability work on the existing branch:

```bash
cross-platform-native-stt
```

Do not create another branch unless necessary.

Do not overwrite or remove the original macOS Apple Silicon workflow.

The goal is to add Windows/Linux portability and optional Windows native STT while preserving current functionality.

---

## Existing Functionality That Must Be Preserved

Do not remove or break:

```text
Whisper STT
Whisper Large default
Large Turbo option if available
Fast mode
MPS support on Apple Silicon
Apple STT on macOS
Both-provider mode
Invalid transcript validation
Retry behavior
Provider statuses
Attempt ID storage
runs/<attemptId>/result.json
Practice history
Recording trimming
Fluency/timing score
Export Practice Report
Current UI flow
run_web_app.sh for macOS/Linux
```

Apple STT must remain macOS-only and experimental.

Whisper must remain the default and cross-platform STT provider.

---

## Main Update Goal

Make the repo portable to:

```text
macOS Apple Silicon: primary supported platform
Windows: supported with Whisper + optional Windows Speech
Linux: supported with Whisper only
```

Add optional Windows native STT support as a Windows-only comparison provider.

---

## Platform Behavior

### macOS Apple Silicon

Available providers:

```text
Whisper
Apple Speech
Both = Whisper + Apple Speech
```

Device behavior:

```text
mps if available
cpu fallback
```

Apple Speech should be visible only on macOS.

### Windows

Available providers:

```text
Whisper
Windows Speech
Both = Whisper + Windows Speech
```

Device behavior:

```text
cuda if available
cpu fallback
never mps
```

Windows Speech should be visible only on Windows.

### Linux

Available providers:

```text
Whisper only
```

Device behavior:

```text
cuda if available
cpu fallback
never mps
```

Apple Speech and Windows Speech should be hidden or disabled.

Both mode should be hidden or disabled unless a native comparison provider is available.

---

## Required Changes

### 1. Platform Detection

Add platform detection in both backend and frontend.

The app should know whether it is running on:

```text
darwin
win32
linux
```

Use this to decide:

```text
available STT providers
available devices
default device
which warning messages to show
```

### 2. Provider Availability

Rules:

```text
Apple Speech:
- macOS only
- hidden/disabled on Windows and Linux

Windows Speech:
- Windows only
- hidden/disabled on macOS and Linux

Whisper:
- available on macOS, Windows, Linux
- default provider everywhere
```

Unavailable native providers must not produce `0.0/100`.

Use statuses such as:

```text
ok
ok_retry
failed
invalid
skipped
unavailable
```

### 3. Windows Native STT

Add a new provider:

```text
windows_speech
```

Suggested files:

```text
scripts/stt_providers/windows_speech_provider.py
scripts/windows_speech_helper/
```

Implementation preference:

```text
Python provider calls a Windows-only helper.
The helper may be PowerShell or a small C#/.NET program.
```

The provider should:

```text
accept an audio file path
convert unsupported audio to 16 kHz mono WAV using ffmpeg if needed
return transcript text
return structured provider result
mark itself unavailable outside Windows
```

Frontend label:

```text
Windows Speech - experimental
Native system STT
```

### 4. Device Selection

Device selection should be platform-aware.

Rules:

```text
macOS Apple Silicon:
- mps
- cpu

Windows/Linux with NVIDIA:
- cuda
- cpu

Other Windows/Linux:
- cpu
```

Never select or display `mps` on Windows/Linux.

### 5. Startup Scripts

Keep:

```text
run_web_app.sh
```

Add:

```text
run_web_app.ps1
```

The PowerShell script should start backend and frontend on Windows.

It should allow configurable ports if the repo already supports:

```text
BACKEND_PORT
FRONTEND_PORT
VITE_API_BASE
```

### 6. Python Dependencies

Add one of:

```text
requirements.txt
```

or:

```text
environment.yml
```

Prefer `requirements.txt` if the repo is intended to be easy for Windows/Linux users to install.

Include core dependencies needed for the current Python STT/scoring pipeline.

Do not include OS-specific native STT packages unless optional or clearly documented.

### 7. README Cleanup

Update README for public cross-platform use.

Remove local machine paths such as:

```text
/Users/bladeruuner/...
```

Add setup sections:

```text
macOS setup
Windows setup
Linux setup
```

Add ffmpeg install instructions:

```text
macOS: brew install ffmpeg
Windows: winget install Gyan.FFmpeg or choco install ffmpeg
Linux: sudo apt install ffmpeg
```

Document:

```text
Whisper is default/recommended.
Whisper Large is default.
Apple Speech is macOS-only and experimental.
Windows Speech is Windows-only and experimental.
Linux currently supports Whisper only.
```

### 8. .gitignore

Ensure generated files are ignored:

```gitignore
recordings/
transcripts/
results/
runs/
model_audio/
generated_reports/
*.wav
*.webm
*.mp3
*.m4a
*.log
node_modules/
frontend/node_modules/
backend/node_modules/
__pycache__/
*.pyc
.DS_Store
.env
.venv/
```

Do not remove required source files.

### 9. Web Storage Behavior

Web requests must continue using:

```text
runs/<attemptId>/
runs/<attemptId>/result.json
```

Fixed files such as:

```text
recordings/my_recording.wav
transcripts/my_recording.txt
results/comparison.txt
```

should only be used for legacy CLI examples, not web requests.

### 10. Tests

Add or update tests for:

```text
Apple STT disabled on Windows/Linux
Windows Speech disabled on macOS/Linux
windows_speech selectable only on Windows
mps not selected outside macOS
cuda/cpu fallback works on Windows/Linux
unavailable Windows Speech does not create 0.0/100 score
unavailable Apple Speech does not create 0.0/100 score
```

Keep existing tests for:

```text
invalid transcript validation
Whisper retry
provider statuses
both-provider mode
attemptId storage
result.json
practice history
```

---

## Safety Requirements

Before making changes, Codex should check:

```bash
git status
```

Expected state:

```text
On branch cross-platform-native-stt
nothing to commit, working tree clean
```

After making changes, Codex should summarize:

```text
changed files
new files
tests run
platform behavior
known limitations
```

Do not commit automatically unless explicitly asked.

---

## Final Expected Behavior

### macOS

```text
Default provider: Whisper
Default model: Large
Native comparison: Apple Speech
Both mode: Whisper + Apple Speech
Default device: mps if available
```

### Windows

```text
Default provider: Whisper
Default model: Large
Native comparison: Windows Speech
Both mode: Whisper + Windows Speech
Default device: cuda if available, otherwise cpu
```

### Linux

```text
Default provider: Whisper
Default model: Large
Native comparison: none
Both mode: hidden/disabled
Default device: cuda if available, otherwise cpu
```

---

## Final Instruction for Codex

Implement cross-platform portability and optional Windows native STT on the existing branch:

```bash
cross-platform-native-stt
```

Preserve the current macOS Apple Silicon workflow and all existing pronunciation-practice features.
