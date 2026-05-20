# Whisper Speaking Practice Improvement Checklist

## Speed

- [x] Add a `Fast Strict - Large Turbo` option if the installed Whisper package supports `large-v3-turbo`.
- [x] Add a clear UI toggle for `Whisper only`, `Apple only`, and `Both`.
- [ ] Use `Practice Check - Medium` for repeated practice and `Strict Check - Large` for final benchmark checks.
  - Status: Partially done. Both model choices exist, but there is no guided practice-vs-benchmark mode yet.
- [ ] Add a visible `Whisper Large warming up` state before the first check.
- [ ] Cache/preprocess audio per attempt instead of relying on fixed files like `my_recording.wav`.
- [ ] Skip Apple STT automatically when Whisper already has a high score, unless comparison mode is explicitly selected.

## Reliability

- [x] Add a unique request ID for every check so logs, transcripts, and results cannot mix across attempts.
- [x] Store each attempt's audio, transcripts, and result files with unique filenames.
- [ ] Replace the simple one-request lock with a backend job queue.
  - Status: Partially done. Overlapping `/api/practice` requests are blocked with a one-request lock.
- [ ] Add clearer language mismatch detection, for example Polish target text while the UI language is Vietnamese.
  - Status: Partially done. Polish-looking target text is detected and logged, but the selected UI language is kept by default. Set `STT_LANGUAGE_AUTO_OVERRIDE=1` to auto-override.
- [ ] Add a debug panel showing selected language, model, device, provider status, and timing breakdown.

## Feedback Quality

- [ ] Separate STT confidence from pronunciation score more clearly.
  - Status: Partially done. Word accuracy and fluency/timing are separated, and provider statuses are shown.
- [ ] Treat Apple STT as comparison evidence, not equal ground truth for every language.
  - Status: Partially done. Apple is labeled experimental/comparison, but both scores are still shown side by side.
- [x] Improve focus-word selection using only valid transcripts and alignment confidence.
- [x] Add sentence-level feedback for pace, pauses, missing endings, and rhythm.
- [x] Add a per-word practice loop: listen to word, record word, compare word.

## UX

- [ ] Add separate `Quick Practice` and `Benchmark` modes.
- [ ] Replace estimated frontend progress with real backend progress events.
- [ ] Add a `Last run timing` summary with Whisper time, Apple time, scoring time, and total time.
- [x] Show a warning if another browser tab is already checking a recording.
- [ ] Suggest shorter chunks automatically when a sentence is long or Whisper takes too long.
  - Status: Partially done. Manual sentence chunk practice exists.

## Architecture

- [x] Move scoring outputs away from fixed files like `transcripts/my_recording.txt`.
- [x] Use unique attempt IDs across recording files, transcript files, comparison files, and history entries.
- [ ] Make all STT providers return the same structured result format.
  - Status: Partially done. Backend/worker responses are structured, but provider classes still expose plain `transcribe()` strings.
- [x] Add more tests for invalid transcripts, retry behavior, provider statuses, and both-provider mode.
- [ ] Consider Server-Sent Events, WebSocket, or polling for real backend job status.

## Suggested Priority

- [x] Priority 1: Add unique attempt IDs for audio, transcripts, and results.
- [ ] Priority 2: Add real backend progress events with per-step timings.
- [x] Priority 3: Add `Large Turbo` or a dedicated benchmark mode for faster strict checks.
