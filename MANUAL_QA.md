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
- [ ] macOS: Apple Speech-only either works or shows an unavailable status.
- [ ] macOS: Both mode returns Whisper even if Apple fails.
- [ ] Windows: Whisper-only works.
- [ ] Windows: Windows Speech-only either works or shows an unavailable status.
- [ ] Windows: Both mode returns Whisper even if Windows Speech fails.
- [ ] Linux: only Whisper is available in the provider selector.

## Storage

- [ ] Each check creates a unique `runs/<attemptId>/result.json`.
- [ ] Practice history points to the correct attempt ID.
- [ ] Clear history and local runs removes browser history and generated backend files.
