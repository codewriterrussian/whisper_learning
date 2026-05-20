# Whisper Speaking Practice

This folder follows `/Users/bladeruuner/PycharmProjects/whisper_speaking_practice_workflow.md`.

## Setup

Your existing `stt_whisper` Conda env has Whisper and RapidFuzz. I installed `edge-tts` there too, so use:

```bash
cd /Users/bladeruuner/PycharmProjects/whisper_learning
conda activate stt_whisper
```

If you ever rebuild the environment from scratch:

```bash
conda create -n speaking-practice python=3.10 -y
conda activate speaking-practice
pip install -U openai-whisper edge-tts rapidfuzz
brew install ffmpeg
```

Check tools:

```bash
whisper --help
edge-tts --help
ffmpeg -version
```

## STT providers

Whisper remains the primary speech-to-text provider. The web app defaults to `both` so one recording is checked by Whisper and Apple Speech when available. Apple Speech is experimental and macOS-only.

### Whisper STT

Use Whisper directly through the repo wrapper:

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider whisper \
  --language en \
  --model large \
  --device auto \
  --fast-mode \
  --output transcripts/my_recording.txt
```

The shell helper defaults to Whisper:

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --language en --model large --device auto --fast-mode
```

The student-facing app shows two check modes:

```text
Strict Check - Large
Fast Strict - Large Turbo
Practice Check - Medium
```

`large` is the normal default for every language because it is more reliable for Polish and multilingual pronunciation practice. `large-v3-turbo` is available as a faster strict option when supported by your Whisper install. `medium` remains available only as a faster rough check when you need quicker feedback and can accept less stable transcripts. Developer-only Whisper model names such as `tiny`, `base`, `small`, `large-v3`, and `turbo` are still accepted by the backend/CLI when explicitly passed.

`--fast-mode` is enabled by default. It uses faster decoding settings for short sentence recordings:

```text
beam_size=1
best_of=1
temperature=0
condition_on_previous_text=False
word_timestamps=False
```

When a practice language is selected, it is passed directly to Whisper to avoid language auto-detection mistakes. Input audio is converted to reusable 16 kHz mono wav before STT; reruns reuse the converted wav when it is newer than the source audio. Device can be `auto`, `mps`, or `cpu`.

The web backend uses a long-lived STT worker so the selected Whisper model is cached by model name and device instead of reloading for every checked recording. To preload Large during backend startup:

```bash
WHISPER_WARMUP=1 ./run_web_app.sh
```

### Apple Speech STT

Apple Speech is macOS-only and uses Apple's native Speech framework through a small Swift helper script launched from Python. It converts the input audio to 16 kHz mono wav with `ffmpeg` before transcription, so `.wav`, `.m4a`, and `.webm` inputs can be used when `ffmpeg` can read them. The app language is mapped to an Apple locale such as `pl-PL`, `de-DE`, or `ja-JP`.

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider apple \
  --language pl \
  --output transcripts/my_recording.txt
```

Or with the shell helper:

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --stt-provider apple --language pl
```

macOS may ask for Speech Recognition permission. Apple Speech runs in the backend process, not in the browser. If you open the page in Arc but start the backend from Terminal, iTerm, PyCharm, or VS Code, enable Speech Recognition for that backend-launching app in System Settings, then restart the backend and run the command again.

### Both providers

Use `both` to transcribe the same input audio with Whisper and Apple Speech. In `both` mode, Whisper and Apple STT run in parallel so checking time is closer to the slower provider instead of the sum of both. Whisper still returns if Apple Speech is unavailable or fails.

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider both \
  --language en \
  --model large \
  --device auto \
  --fast-mode \
  --output transcripts/my_recording.txt
python scripts/compare.py --stt-provider both
```

If Whisper returns a garbage transcript such as repeated punctuation, the app logs validation details in the backend/worker console, retries Whisper once with safer decoding settings, and marks the provider as `ok_retry` if the retry recovers. Raw garbage transcripts are not shown in the UI.

This writes:

```text
transcripts/my_recording.whisper.txt
transcripts/my_recording.apple.txt
results/comparison.txt
```

Or with the shell helper:

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --stt-provider both --language en --model large --fast-mode
python scripts/compare.py --stt-provider both
```

## Fluency & Timing Match

The main score remains the STT transcript score: did Whisper or Apple Speech understand the words?

The web app also computes a supporting audio feature comparison when model audio exists:

```text
Timing match
Rhythm match
Acoustic similarity
Model duration
Your duration
Speed ratio
Main issue: pace, silence, or acoustic similarity
Auto-trimmed silence removed
```

This does not use raw waveform shape as the main pronunciation score. The app preprocesses model and user audio to 16 kHz mono wav, trims leading/trailing silence, normalizes loudness, extracts lightweight frame features, aligns them with DTW, and reports the result in the collapsed `Fluency & Timing Match` section. The backend saves `recordings/my_recording.auto_trimmed.wav` for automatic silence trimming. If you manually trim an attempt in the UI, that manual trim overrides auto-trim for the submitted recording. Use these metrics as rhythm/timing guidance, not as the main pronunciation grade.

### Smoke tests

Provider selection and default-provider checks:

```bash
python -m unittest tests.test_stt_providers
```

Optional Apple Speech smoke test on macOS:

```bash
RUN_APPLE_STT_SMOKE=1 python -m unittest tests.test_stt_providers.STTProviderTests.test_apple_provider_smoke
```

## Daily Loop

Edit `targets/target.txt`, then run:

```bash
VOICE="nl-NL-ColetteNeural" ./scripts/make_model_audio.sh
afplay model_audio/target.mp3
SECONDS_TO_RECORD=8 ./scripts/record_mac.sh
LANGUAGE="nl" MODEL="large" ./scripts/transcribe.sh recordings/my_recording.wav
python scripts/compare.py
```

Or run the full loop:

```bash
./scripts/practice_once.sh
```

## Web app workflow

### Start

```bash
conda activate stt_whisper
./run_web_app.sh
```

Then open:

```text
http://localhost:6173
```

When you click `Check Selected Recording`, the app shows a visible checking progress panel with staged statuses for audio preparation, auto-trim, WAV conversion, Whisper Large, optional Apple STT, transcript comparison, Fluency & Timing Match, teacher feedback, and history saving. This first version uses frontend staged progress and updates to the final result when the backend returns. The backend also logs timing for audio preparation, auto-trim, Whisper/Apple STT, scoring, fluency matching, and total request time.

The backend runs on `http://localhost:6174`.

### Practice flow

1. Select the practice language.
2. Paste the sentence you want to practice.
3. Optionally click `Generate Target Audio` and listen to the model audio.
4. Click `Start Recording`.
5. Speak the sentence.
6. Click `Stop Recording`.
7. Click `Submit Practice`.
8. Read the Whisper transcript and comparison result.

## Voices

```bash
VOICE="nl-NL-ColetteNeural" ./scripts/make_model_audio.sh
VOICE="de-DE-KatjaNeural" LANGUAGE="German" ./scripts/practice_once.sh
VOICE="pl-PL-ZofiaNeural" LANGUAGE="Polish" ./scripts/practice_once.sh
VOICE="vi-VN-HoaiMyNeural" LANGUAGE="Vietnamese" ./scripts/practice_once.sh
VOICE="ja-JP-NanamiNeural" LANGUAGE="Japanese" ./scripts/practice_once.sh
VOICE="en-US-JennyNeural" LANGUAGE="English" ./scripts/practice_once.sh
```
