# Public Release Checklist

## Product Scope

- [ ] Decide the public positioning: local pronunciation practice app, research prototype, or production-ready tool.
- [x] Define supported languages for the first public release.
  - Status: Done in UI/code for English, German, Dutch, Polish, Russian, Japanese, Vietnamese, and Chinese.
- [x] Decide whether Apple STT is public, experimental, or hidden behind an advanced setting.
  - Status: Apple STT is exposed in advanced settings and documented as experimental/macOS-only.
- [ ] Decide default model mode for public users: `large-v3-turbo`, `large`, or `medium`.
  - Status: Partially done. Code defaults to server `WHISPER_MODEL`/Large, and UI includes Turbo/Medium, but public release positioning is not finalized.
- [ ] Document expected runtime and hardware requirements for each model mode.

## Privacy And Data

- [ ] Add a clear privacy note explaining that recordings are processed locally by default.
- [ ] Document what files are saved under `runs/<attemptId>/`.
- [ ] Add a UI control or documented command to clear saved runs/history.
- [ ] Add `.gitignore` entries for generated audio, transcripts, model audio, runs, results, and local caches.
- [ ] Confirm no personal recordings, transcripts, or generated reports are committed.
  - Status: Not done. Generated local files currently exist in `recordings/`, `transcripts/`, `results/`, `runs/`, `targets/`, and `model_audio/`.
- [ ] Confirm no API keys, tokens, local usernames, or machine-specific secrets are committed.
  - Status: Not done. README currently includes local machine paths such as `/Users/bladeruuner/...`.

## Installation

- [ ] Provide a clean `README.md` quick start from a fresh clone.
  - Status: Partially done. README has setup/start steps, but still references local paths and an existing local Conda env.
- [ ] Document Python version and environment setup.
  - Status: Partially done. README suggests Python 3.10 and a Conda env, but no lockfile/environment file is provided.
- [ ] Document Node.js version requirement.
- [x] Document `ffmpeg` installation.
- [ ] Document Whisper model download behavior and expected disk usage.
  - Status: Partially done. Whisper model behavior is discussed, but download size/disk requirements are not documented.
- [x] Document Apple Silicon/MPS requirements and CPU fallback behavior.
- [ ] Add troubleshooting for common install errors.
  - Status: Partially done. README includes some Apple STT and Edge TTS notes, but no full troubleshooting section.

## Runtime Configuration

- [ ] Document environment variables:
  - [x] `PYTHON`
  - [ ] `WHISPER_MODEL`
    - Status: Partially documented in usage examples, not in a consolidated env-var table.
  - [ ] `WHISPER_DEVICE`
    - Status: Partially documented in usage examples, not in a consolidated env-var table.
  - [x] `WHISPER_WARMUP`
  - [ ] `WHISPER_RETRY_DEVICE`
    - Status: Implemented and logged, not documented in README.
  - [ ] `STT_LANGUAGE_AUTO_OVERRIDE`
    - Status: Implemented, not documented in README.
  - [ ] `BACKEND_PORT`
    - Status: Implemented by `run_web_app.sh`, not documented in README.
  - [ ] `FRONTEND_PORT`
    - Status: Implemented by `run_web_app.sh`, not documented in README.
  - [ ] `VITE_API_BASE`
    - Status: Implemented by frontend/run script, not documented in README.
- [x] Make default ports easy to change.
- [x] Ensure the app fails clearly when ports are already in use.
- [x] Ensure startup logs show selected model, device, provider mode, and warmup state.

## Model And STT Behavior

- [x] Keep Whisper as the primary/default STT backend.
- [x] Keep Apple STT optional and macOS-only.
- [x] Keep `both` mode available for comparison.
- [ ] Confirm `large-v3-turbo` is optional and gracefully unavailable if the installed Whisper package does not support it.
- [ ] Add a clear warning when a selected model is not installed or unsupported.
- [x] Keep invalid transcript validation and retry behavior.
- [x] Keep provider status fields: `ok`, `ok_retry`, `failed`, `invalid`, `skipped`.
- [x] Keep raw garbage transcripts hidden from the UI.

## Files And Storage

- [x] Ensure every web check writes to `runs/<attemptId>/`.
- [x] Ensure fixed files like `recordings/my_recording.wav` are only used by legacy CLI scripts, not web requests.
- [x] Keep canonical `runs/<attemptId>/result.json`.
- [x] Include attempt metadata, provider statuses, transcripts, scores, timing, feedback, and file paths in `result.json`.
- [ ] Add a retention/cleanup policy for old runs.
- [ ] Add a command or UI action to delete a run.

## UI/UX

- [ ] Verify the app works in Chrome, Arc, Safari, and Firefox where supported.
- [ ] Verify microphone selection works after browser permission is granted.
  - Status: Partially done. Microphone selector exists; cross-browser QA is not documented.
- [ ] Make the model/provider settings understandable for non-developer users.
  - Status: Partially done. Labels exist, but advanced model/provider choices still need public-user copy review.
- [x] Keep advanced settings collapsed by default.
- [x] Ensure progress UI appears inside the result panel, not as a full-width layout break.
- [x] Show real backend progress or clearly label progress as estimated.
  - Status: Current progress is staged/estimated and README describes it that way.
- [ ] Ensure mobile layout remains usable.
- [x] Ensure no result section shows placeholder scores while checking.
- [x] Ensure failed/invalid providers do not show `0.0/100`.

## Feedback Quality

- [x] Verify word accuracy and fluency/timing are visually separated.
- [x] Verify Apple STT is described as experimental/comparison mode.
- [x] Verify focus word logic ignores invalid transcripts.
- [x] Verify teacher feedback does not overstate certainty when only one provider misses a word.
- [x] Verify feedback handles high word accuracy but low fluency/timing.
- [x] Verify exported reports include target, transcripts, scores, focus word, teacher feedback, timing, and provider statuses.

## Performance

- [ ] Benchmark `medium`, `large`, and `large-v3-turbo` on Apple Silicon.
- [ ] Benchmark cold start versus warm start.
- [ ] Benchmark Whisper-only, Apple-only, and both-provider mode.
- [x] Confirm Whisper and Apple run in parallel in `both` mode.
- [x] Confirm overlapping submissions are blocked.
- [ ] Document realistic timing expectations.
- [ ] Consider a shorter default sentence for first-time users.

## Testing

- [ ] Add a single command that runs all tests.
  - Status: Not done. Backend and Python tests are separate commands.
- [x] Keep backend storage tests.
- [x] Keep STT provider selection tests.
- [x] Keep invalid transcript validation tests.
- [x] Keep Whisper retry tests.
- [x] Keep both-provider fallback tests.
- [ ] Add frontend smoke tests for result rendering.
- [ ] Add an integration smoke test for `/api/practice` with mocked STT providers.
- [ ] Add a manual QA checklist for microphone recording and trimming.

## Packaging

- [ ] Decide whether public users run from source, a local app bundle, Docker, or packaged desktop app.
- [x] If source-based, provide `./run_web_app.sh` as the main entrypoint.
- [x] If packaging for macOS, document Apple Speech permissions.
- [ ] If Docker is supported, document that Apple STT and MPS may not work inside Docker.
- [ ] Add version number and release notes.

## Documentation

- [ ] Clean up README sections for public users versus developer notes.
- [ ] Add screenshots or a short demo GIF.
- [x] Add examples for English, Polish, Vietnamese, and one additional language.
- [ ] Add a troubleshooting section for:
  - [ ] Whisper model download is slow.
  - [ ] MPS is unavailable.
  - [x] Apple STT permission fails.
    - Status: Covered in README and provider error messages.
  - [ ] Microphone permission fails.
    - Status: UI has runtime messages, README troubleshooting section is missing.
  - [x] STT returns punctuation or empty transcript.
    - Status: Validation/retry behavior is documented.
  - [ ] Browser points to the wrong backend URL.
- [ ] Add a limitations section.

## Security

- [x] Bind backend to localhost by default.
- [ ] Avoid exposing arbitrary file paths through the API.
  - Status: Partially done. API returns repo-relative run paths in result JSON, not arbitrary absolute paths.
- [ ] Validate uploads by size and MIME/type where practical.
- [ ] Set a reasonable max upload size.
- [x] Avoid serving `runs/` directly unless access rules are explicit.
- [ ] Review dependencies for known vulnerabilities.

## Repository Hygiene

- [ ] Add or update `.gitignore`.
- [ ] Remove generated files from the repo.
  - Status: Not done. Generated files currently exist in `recordings/`, `transcripts/`, `results/`, `runs/`, `targets/`, and `model_audio/`.
- [ ] Remove local machine paths from docs where possible.
  - Status: Not done. README contains `/Users/bladeruuner/...`.
- [ ] Ensure scripts are executable where needed.
  - Status: Partially done. `run_web_app.sh` is executable; all script permissions have not been audited.
- [ ] Ensure naming and spelling are clean in public-facing docs.
- [ ] Add license file.
- [ ] Add contribution guidelines if accepting outside contributions.

## Release Readiness

- [ ] Fresh clone setup succeeds on a clean macOS machine.
- [ ] First run succeeds after installing documented dependencies.
- [x] Model warmup completes and is visible in logs.
- [x] A full check produces `runs/<attemptId>/result.json`.
- [x] Export Practice Report works.
- [ ] No generated personal data is included in the release.
- [ ] Tag the release in version control.
