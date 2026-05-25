# Manual QA Checklist

Use this checklist before tagging a public release.

## Browsers

- [ ] Chrome: load app, generate target audio, record, trim, check, export report.
- [ ] Arc: load app, generate target audio, record, trim, check, export report.
- [ ] Safari: load app, grant microphone permission, record, check.
- [ ] Firefox: load app, grant microphone permission, record, check.

## Microphone

- [ ] Microphone selector populates after permission is granted.
- [ ] Default microphone records audio.
- [ ] A selected non-default microphone records audio.
- [ ] Live waveform moves while recording.
- [ ] Denied microphone permission shows a readable error.

## Layout

- [ ] Desktop two-column layout is intact.
- [ ] Mobile layout stacks cleanly without overlapping controls.
- [ ] STT progress appears inside the result panel.
- [ ] Attempt cards show audio, waveform, trim controls, select, and delete without overlap.

## STT Providers

- [ ] macOS: Whisper-only works.
- [ ] macOS Apple Silicon: first-run/default Whisper device is MPS.
- [ ] macOS Advanced Mode: MPS and CPU remain selectable; MPS is the Apple Silicon default and CPU is the compatibility option.
- [ ] macOS Advanced Mode: if Whisper/MPS fails, the app shows a clear non-fatal error or fallback message without breaking the UI.
- [ ] macOS: Apple Speech-only either works or shows a clear unavailable/permission warning.
- [ ] macOS: Both mode returns Whisper and keeps scoring visible even if Apple STT is blocked by Speech Recognition permission.
- [ ] Windows: Whisper-only works.
- [ ] Windows: provider selector defaults to Whisper only and shows native comparison as skipped.
- [ ] Linux: only Whisper is available in the provider selector.

## Storage

- [ ] Each check creates a unique `runs/<attemptId>/result.json`.
- [ ] Practice history points to the correct attempt ID.
- [ ] Clear history and local runs removes browser history and generated backend files.
