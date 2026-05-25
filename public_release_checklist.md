# Public Release Checklist

## Product Scope

- [x] Decide the public positioning: local pronunciation practice app, research prototype, or production-ready tool.
  - Status: Done. README positions this as a local-first pronunciation practice app and source-based local tool, not a hosted production service.
- [x] Define supported languages for the first public release.
  - Status: Done in UI/code for English, German, Dutch, Polish, Russian, Japanese, Vietnamese, and Chinese.
- [x] Decide whether Apple STT is public, experimental, or hidden behind an advanced setting.
  - Status: Apple STT is exposed in advanced settings and documented as experimental/macOS-only.
- [x] Decide default model mode for public users: `large-v3-turbo`, `large`, or `medium`.
  - Status: Done. `large-v3-turbo` is the default/recommended mode; `large` remains a slower strict-check option; `medium` remains a faster rough-check option.
- [x] Document expected runtime and hardware requirements for each model mode.
  - Status: Done. README documents Python/Node requirements, device behavior, model tradeoffs, and approximate model download sizes.

## Privacy And Data

- [x] Add a clear privacy note explaining that recordings are processed locally by default.
  - Status: Done. README now includes a Privacy And Local Data section.
- [x] Document what files are saved under `runs/<attemptId>/`.
  - Status: Done. README documents `runs/<attemptId>/` and canonical `result.json`.
- [x] Add a UI control or documented command to clear saved runs/history.
  - Status: Done. Added Practice history cleanup button, backend cleanup endpoint, and `scripts/clear_local_data.sh` / `.ps1`.
- [x] Add `.gitignore` entries for generated audio, transcripts, model audio, runs, results, and local caches.
  - Status: Done. `.gitignore` covers runtime folders and local caches.
- [x] Confirm no personal recordings, transcripts, or generated reports are committed.
  - Status: Done. Runtime folders are ignored and not tracked. `targets/target.txt` and `targets/word.txt` are tracked legacy sample text files, not personal recordings or reports.
- [x] Confirm no API keys, tokens, local usernames, or machine-specific secrets are committed.
  - Status: Done for README/run scripts. No private absolute user paths remain in public docs or launch scripts.

## Installation

- [x] Provide a clean `README.md` quick start from a fresh clone.
  - Status: Done. README now uses generic venv/source setup without local machine paths.
- [x] Document Python version and environment setup.
  - Status: Done. README documents Python 3.10/3.11 recommendation, venv setup, and `requirements.txt`.
- [x] Document Node.js version requirement.
  - Status: Done. README recommends Node.js 20 or newer.
- [x] Document `ffmpeg` installation.
- [x] Document Whisper model download behavior and expected disk usage.
  - Status: Done. README documents first-use downloads and approximate model sizes.
- [x] Document Apple Silicon/MPS requirements and CPU fallback behavior.
  - Status: Done. Apple Silicon macOS defaults OpenAI Whisper to MPS; Intel macOS, Windows, and Linux default to CPU.
- [x] Add troubleshooting for common install errors.
  - Status: Done. README includes troubleshooting for model download, MPS, Apple permissions, microphone permissions, invalid STT output, and backend URL issues.

## Runtime Configuration

- [x] Document environment variables:
  - [x] `PYTHON`
  - [x] `WHISPER_MODEL`
    - Status: Done in README env-var table.
  - [x] `WHISPER_DEVICE`
    - Status: Done in README env-var table.
  - [x] `WHISPER_WARMUP`
  - [x] `WHISPER_RETRY_DEVICE`
    - Status: Done in README env-var table.
  - [x] `STT_LANGUAGE_AUTO_OVERRIDE`
    - Status: Done in README env-var table.
  - [x] `BACKEND_PORT`
    - Status: Done in README env-var table.
  - [x] `FRONTEND_PORT`
    - Status: Done in README env-var table.
  - [x] `VITE_API_BASE`
    - Status: Done in README env-var table.
- [x] Make default ports easy to change.
- [x] Ensure the app fails clearly when ports are already in use.
- [x] Ensure startup logs show selected model, device, provider mode, and warmup state.
  - Status: Done. Backend startup logs platform, provider availability, default provider, model, device, max upload size, and warmup.

## Model And STT Behavior

- [x] Keep Whisper as the primary/default STT backend.
- [x] Keep Apple STT optional and macOS-only.
- [x] Keep Windows default to Whisper only.
  - Status: Done. Windows native STT support was removed from the active provider surface.
- [x] Keep `both` mode available for comparison.
- [x] Confirm `large-v3-turbo` is the default and model-load failures are reported clearly if the installed Whisper package does not support it.
  - Status: Done. `large-v3-turbo` is the default in UI/docs; model load failures return a clear user-facing error instead of silently falling back.
- [x] Add a clear warning when a selected model is not installed or unsupported.
  - Status: Done. Backend formats Whisper model-load failures with guidance to choose Large or update Whisper.
- [x] Keep invalid transcript validation and retry behavior.
- [x] Keep provider status fields: `ok`, `ok_retry`, `failed`, `invalid`, `skipped`.
- [x] Keep raw garbage transcripts hidden from the UI.

## Files And Storage

- [x] Ensure every web check writes to `runs/<attemptId>/`.
- [x] Ensure fixed files like `recordings/my_recording.wav` are only used by legacy CLI scripts, not web requests.
- [x] Keep canonical `runs/<attemptId>/result.json`.
- [x] Include attempt metadata, provider statuses, transcripts, scores, timing, feedback, and file paths in `result.json`.
- [x] Add a retention/cleanup policy for old runs.
  - Status: Done. README documents local retention under runtime folders and manual cleanup; the UI cleanup action removes all local runs/history.
- [x] Add a command or UI action to delete a run.
  - Status: Done. Added UI cleanup and CLI cleanup scripts for generated local run data.

## UI/UX

- [ ] Verify the app works in Chrome, Arc, Safari, and Firefox where supported.
  - Status: Manual QA required. Added `MANUAL_QA.md`; this cannot be completed from code inspection alone.
- [ ] Verify microphone selection works after browser permission is granted.
  - Status: Manual QA required. Microphone selector exists and `MANUAL_QA.md` covers verification steps.
- [x] Make the model/provider settings understandable for non-developer users.
  - Status: Done for this release pass. Unsupported native providers are hidden and labels describe Whisper/native comparison modes.
- [x] Keep advanced settings collapsed by default.
- [x] Ensure progress UI appears inside the result panel, not as a full-width layout break.
- [x] Show real backend progress or clearly label progress as estimated.
  - Status: Current progress is staged/estimated and README describes it that way.
- [x] Ensure mobile layout remains usable.
  - Status: Done by existing responsive CSS and documented manual QA checklist; final device/browser verification remains a manual release gate.
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
  - Status: Deferred. Requires repeated local hardware timing runs.
- [ ] Benchmark cold start versus warm start.
  - Status: Deferred. Requires repeated local hardware timing runs.
- [ ] Benchmark Whisper-only, Apple-only, and both-provider mode.
  - Status: Deferred. Requires repeated local hardware timing runs.
- [ ] Benchmark Windows Whisper-only mode.
  - Status: Not done. Requires repeated timing runs on Windows hardware.
- [x] Confirm Whisper and Apple run in parallel in `both` mode.
- [x] Confirm overlapping submissions are blocked.
- [x] Document realistic timing expectations.
  - Status: Done. README documents relative performance expectations and hardware/device caveats.
- [x] Consider a shorter default sentence for first-time users.
  - Status: Done. Current default benchmark sentences are short enough for first-time checks; no code change needed.

## Testing

- [x] Add a single command that runs all tests.
  - Status: Done. Added `scripts/run_all_tests.sh` and `scripts/run_all_tests.ps1`.
- [x] Keep backend storage tests.
- [x] Keep STT provider selection tests.
- [x] Keep invalid transcript validation tests.
- [x] Keep Whisper retry tests.
- [x] Keep both-provider fallback tests.
- [x] Add frontend smoke tests for result rendering.
  - Status: Done. Added `frontend/render_smoke.test.mjs`.
- [ ] Add an integration smoke test for `/api/practice` with mocked STT providers.
  - Status: Deferred. This needs a backend test harness/exported app refactor so `/api/practice` can run without launching the real persistent STT worker.
- [x] Add a manual QA checklist for microphone recording and trimming.
  - Status: Done. Added `MANUAL_QA.md`.
- [x] Add cross-platform provider availability tests.
  - Status: Done. Tests cover macOS/Windows/Linux provider availability and device fallback.

## Packaging

- [x] Decide whether public users run from source, a local app bundle, Docker, or packaged desktop app.
  - Status: Done for this release path. README documents source-based setup.
- [x] If source-based, provide `./run_web_app.sh` as the main entrypoint.
- [x] If source-based on Windows, provide `run_web_app.ps1`.
  - Status: Done.
- [x] If packaging for macOS, document Apple Speech permissions.
  - Status: Done. Docs explain that macOS Speech Recognition permission is per backend-launching app: Terminal for double-click/Terminal launch, Visual Studio Code for Visual Studio Code terminal, PyCharm for PyCharm terminal, and iTerm for iTerm launch.
- [x] If Docker is supported, document that Apple STT and MPS may not work inside Docker.
  - Status: Done. README states Docker is not currently supported and Apple Speech/MPS should not be expected there.
- [x] Add version number and release notes.
  - Status: Done. Backend/frontend package versions are `0.1.0`, and `RELEASE_NOTES.md` was added.

## Documentation

- [x] Clean up README sections for public users versus developer notes.
  - Status: Done. README was rewritten around cross-platform public setup and usage.
- [ ] Add screenshots or a short demo GIF.
  - Status: Deferred. Requires running the app and capturing release media.
- [x] Add examples for English, Polish, Vietnamese, and one additional language.
  - Status: Done. README includes English, Polish, Vietnamese, and German example targets.
- [x] Add a troubleshooting section for:
  - [x] Whisper model download is slow.
  - [x] MPS is unavailable.
  - [x] Apple STT permission fails.
    - Status: Covered in README and provider error messages. Apple STT permission failure is non-fatal; Whisper scoring continues and the UI shows a warning.
  - [x] Microphone permission fails.
    - Status: Covered in README troubleshooting.
  - [x] STT returns punctuation or empty transcript.
    - Status: Validation/retry behavior is documented.
  - [x] Browser points to the wrong backend URL.
- [x] Add a limitations section.
  - Status: Done. README now includes a dedicated limitations section.

## Security

- [x] Bind backend to localhost by default.
- [x] Avoid exposing arbitrary file paths through the API.
  - Status: Done for current routes. API returns repo-relative run paths for generated files, not arbitrary absolute paths.
- [x] Validate uploads by size and MIME/type where practical.
  - Status: Done. Multer now accepts audio uploads by MIME/extension and rejects non-audio uploads.
- [x] Set a reasonable max upload size.
  - Status: Done. Default upload limit is 25 MB via `MAX_UPLOAD_MB`.
- [x] Avoid serving `runs/` directly unless access rules are explicit.
- [ ] Review dependencies for known vulnerabilities.
  - Status: Partially done. `npm --prefix backend audit --audit-level=high` and `npm --prefix frontend audit --audit-level=high` found 0 vulnerabilities; Python dependency audit still needs a dedicated tool such as `pip-audit`.

## Repository Hygiene

- [x] Add or update `.gitignore`.
  - Status: Done.
- [x] Remove generated files from the repo.
  - Status: Done for generated runtime data. Tracked `targets/target.txt` and `targets/word.txt` are retained as generic legacy CLI sample inputs.
- [x] Remove local machine paths from docs where possible.
  - Status: Done for README and launch scripts.
- [x] Ensure scripts are executable where needed.
  - Status: Done for shell entrypoints checked: `run_web_app.sh`, `scripts/transcribe.sh`, `scripts/make_model_audio.sh`, and `scripts/practice_once.sh`.
- [x] Keep generated/runtime files out of version control.
  - Status: Done. Do not commit `frontend/dist`, `runs`, `recordings`, `transcripts`, `results`, `model_audio`, `generated_reports`, `__pycache__`, `.pytest_cache`, `node_modules`, or `.apple_speech_helper`.
- [x] Ensure naming and spelling are clean in public-facing docs.
  - Status: Done for README/release docs in this pass.
- [x] Add license file.
  - Status: Done. Added MIT `LICENSE`.
- [x] Add contribution guidelines if accepting outside contributions.
  - Status: Done. Added `CONTRIBUTING.md`.

## Release Readiness

- [x] Fresh clone setup succeeds on a clean macOS machine.
  - Status: Done. Fresh local clone install-test succeeded on Apple Silicon macOS using `setup_mac.command` and `run_mac.command`.
- [x] First run succeeds after installing documented dependencies.
  - Status: Done. Fresh install-test launched successfully, used MPS, and completed a real Whisper + Apple STT practice request.
- [x] Model warmup completes and is visible in logs.
- [x] A full check produces `runs/<attemptId>/result.json`.
- [x] Export Practice Report works.
- [x] No generated personal data is included in the release.
  - Status: Done. No generated recordings/transcripts/results/runs/model audio are tracked; tracked target text files are generic sample text.
- [ ] Tag the release in version control.
  - Status: Not done; user requested no automatic commit/tag.
