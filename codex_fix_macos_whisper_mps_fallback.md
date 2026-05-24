# Codex Task: Fix macOS Whisper MPS SparseMPS Crash in Clean Install

## Goal

Fix the macOS clean-install runtime failure where Whisper runs with `WHISPER_DEVICE=auto`, selects Apple Silicon MPS, and crashes during transcription with a PyTorch `SparseMPS` backend error.

The repo should remain beginner-friendly. A new macOS user should be able to clone the repo, run `setup_mac.command`, run `run_mac.command`, record audio, and complete a speech check without seeing a PyTorch MPS crash.

---

## Observed Failure

Clean test install path:

```text
/Users/bladeruuner/PycharmProjects/whisper_learning_test_install
```

Branch:

```text
cross-platform-native-stt
```

Run command:

```bash
/Users/bladeruuner/PycharmProjects/whisper_learning_test_install/run_mac.command
```

The app starts successfully:

```text
Backend running at http://localhost:6174
VITE ready at http://127.0.0.1:6173/
Platform: darwin arm64
Available STT providers: whisper, apple, both, colab_whisper
Default STT provider: both
Whisper model: large-v3-turbo
Whisper device: auto
```

But when checking a recording, Whisper crashes:

```text
Error: Could not run 'aten::empty.memory_format' with arguments from the 'SparseMPS' backend.
```

The stack trace points to backend execution of the STT worker:

```text
backend/server.js:475:24
```

This means the app install/startup path is mostly working, but the default macOS Whisper device selection is unsafe for beginner testing because `auto` can route to MPS and hit a PyTorch SparseMPS unsupported operation.

---

## Root Cause

On Apple Silicon, the current app defaults to:

```text
WHISPER_DEVICE=auto
```

The Python Whisper provider likely resolves `auto` to MPS when `torch.backends.mps.is_available()` is true.

However, OpenAI Whisper / PyTorch on MPS can fail with SparseMPS backend errors such as:

```text
aten::empty.memory_format
aten::_sparse_coo_tensor_with_dims_and_tensors
```

This is a known class of MPS compatibility issue. CPU is slower but much safer for beginner release testing.

---

## Required Product Behavior

### 1. macOS beginner/default path must not crash on MPS

For macOS release / beginner flow, default Whisper device should be CPU, not MPS.

Recommended default:

```bash
WHISPER_DEVICE=cpu
```

This should apply at least to:

```text
run_mac.command
run_web_app.sh
setup_mac.command if it writes defaults
backend default config if no env var is present
frontend default STT device if UI stores device defaults
```

The app can still offer MPS in Advanced Mode, but it must not be the first-run default.

---

### 2. Keep MPS available as an advanced option

Do not remove MPS completely.

Desired UI behavior:

- Simple Mode / beginner default: CPU
- Advanced Mode: allow `auto`, `cpu`, and `mps`
- If user manually selects MPS, show a warning such as:

```text
MPS can be faster on Apple Silicon, but Whisper may fail with PyTorch SparseMPS errors. Use CPU if transcription fails.
```

---

### 3. Add automatic fallback from MPS to CPU

Even if a user selects `auto` or `mps`, the app should not fail completely when this known error occurs.

Implement fallback behavior:

1. Run Whisper using selected device.
2. If stderr / exception contains any of these patterns:

```text
SparseMPS
aten::empty.memory_format
aten::_sparse_coo_tensor_with_dims_and_tensors
MPS backend
not currently supported on the MPS backend
Could not run
```

3. Retry once with CPU:

```text
WHISPER_DEVICE=cpu
```

4. Mark provider status clearly in result JSON, for example:

```json
{
  "provider": "whisper",
  "status": "ok",
  "requestedDevice": "auto",
  "actualDevice": "cpu",
  "fallbackReason": "mps_sparse_backend_error"
}
```

5. UI should show a non-fatal warning:

```text
Whisper retried on CPU because Apple Silicon MPS failed for this model.
```

The user should still receive transcript, comparison, score, feedback, and saved history.

---

### 4. Update backend error handling

Find the code around:

```text
backend/server.js:475
```

This is where the STT subprocess error is surfaced.

Improve the backend so that a Python STT worker failure can be classified as retryable if it matches the MPS error patterns.

Suggested implementation structure:

```js
function isMpsSparseError(stderrOrMessage) {
  const text = String(stderrOrMessage || "").toLowerCase();
  return (
    text.includes("sparsemps") ||
    text.includes("aten::empty.memory_format") ||
    text.includes("sparse_coo_tensor") ||
    text.includes("mps backend") ||
    text.includes("not currently supported on the mps backend")
  );
}
```

Then retry the same STT request with device forced to CPU.

Make sure this retry happens only once to avoid infinite loops.

---

### 5. Update Python Whisper provider if needed

Inspect:

```text
scripts/stt_providers/whisper_provider.py
scripts/stt_model.py
scripts/stt_worker.py
```

If device selection currently maps `auto` to MPS on macOS, change the release-safe default.

Recommended logic:

```python
def resolve_whisper_device(requested_device: str) -> str:
    if requested_device in ("cpu", "mps", "cuda"):
        return requested_device

    # auto mode:
    # - cuda if available on Windows/Linux
    # - cpu on macOS by default for release stability
    # - cpu fallback otherwise
```

For macOS:

```python
if platform.system() == "Darwin":
    return "cpu"
```

Alternative acceptable approach:

- Keep `auto` as MPS internally.
- But make launcher/UI default explicitly `cpu`.
- Still implement fallback to CPU.

Best approach:

- macOS Simple Mode default: `cpu`
- Advanced Mode `auto`: may use MPS, but has fallback.

---

### 6. Update launcher scripts

Check and update:

```text
run_mac.command
run_web_app.sh
setup_mac.command
```

Expected safe default for macOS:

```bash
export WHISPER_DEVICE="${WHISPER_DEVICE:-cpu}"
```

Do not use this for macOS beginner default:

```bash
export WHISPER_DEVICE="${WHISPER_DEVICE:-auto}"
```

If `run_web_app.sh` is shared by Linux/macOS, use platform detection:

```bash
case "$(uname -s)" in
  Darwin)
    export WHISPER_DEVICE="${WHISPER_DEVICE:-cpu}"
    ;;
  *)
    export WHISPER_DEVICE="${WHISPER_DEVICE:-auto}"
    ;;
esac
```

---

### 7. Update frontend defaults

Inspect:

```text
frontend/src/main.js
frontend/src/style.css
```

Make sure the UI default for macOS does not force `auto` after backend starts with CPU.

Expected behavior:

- If backend reports default device = `cpu`, frontend should display CPU.
- Do not override backend default with browser localStorage from old installs unless the stored value is valid and intentionally selected.
- In Simple Mode, default accuracy preset should not silently select MPS.

If localStorage stores old `auto`, consider adding a migration:

```js
if (platform === "darwin" && storedDevice === "auto" && simpleMode) {
  device = "cpu";
}
```

---

### 8. Update System Check / Doctor

Inspect:

```text
scripts/doctor.js
```

Add a warning on macOS Apple Silicon:

```text
Whisper CPU mode: recommended for stable beginner use.
MPS mode: experimental; may fail with PyTorch SparseMPS errors.
```

If possible, include a check that reports current effective Whisper device.

---

### 9. Update documentation

Update these files:

```text
README.md
README_en.md
README_BEGINNER.md
README_BEGINNER_zh-TW.md
MANUAL_QA.md
RELEASE_NOTES.md
```

Important documentation changes:

1. macOS default is CPU for stable beginner use.
2. MPS is available only as an advanced / experimental option.
3. If MPS fails, app retries on CPU automatically.
4. CPU may be slower but is more reliable for first-run testing.
5. Users can manually choose MPS in Advanced Mode if they want speed and accept possible fallback.

Suggested Traditional Chinese text for `README.md` / `README_BEGINNER_zh-TW.md`:

```md
### macOS Whisper 裝置設定

在 macOS Apple Silicon 上，本工具預設使用 CPU 執行 Whisper。CPU 速度可能比 MPS 慢，但對初學者與第一次安裝測試更穩定。

MPS 仍可在 Advanced Mode 中手動選擇。不過部分 PyTorch / Whisper 組合可能遇到 SparseMPS 錯誤。如果 MPS 失敗，App 會自動改用 CPU 重試一次，避免整個檢查流程中斷。
```

Suggested English text for `README_en.md` / `README_BEGINNER.md`:

```md
### macOS Whisper device

On Apple Silicon macOS, this app defaults Whisper to CPU for stable beginner use. CPU can be slower than MPS, but it avoids known PyTorch SparseMPS failures during Whisper transcription.

MPS remains available in Advanced Mode. If MPS fails, the app retries once on CPU and reports a non-fatal fallback warning.
```

---

## Manual QA Steps

After changes, test from a clean clone.

### Clean clone test

```bash
cd /Users/bladeruuner/PycharmProjects
rm -rf whisper_learning_test_install

git clone -b cross-platform-native-stt https://github.com/codewriterrussian/whisper_learning.git whisper_learning_test_install
cd whisper_learning_test_install

chmod +x setup_mac.command run_mac.command run_web_app.sh scripts/*.sh
./setup_mac.command
./run_mac.command
```

Open:

```text
http://127.0.0.1:6173/
```

Expected backend startup log:

```text
Platform: darwin arm64
Whisper device: cpu
```

or UI should clearly show CPU as selected.

### Recording test

1. Open the app.
2. Select a target sentence.
3. Record one attempt.
4. Click Check Selected Recording.
5. Confirm no `SparseMPS` crash occurs.
6. Confirm result contains transcript, word accuracy, feedback, and history entry.

### Advanced MPS test

1. Open Advanced Mode.
2. Manually select MPS or Auto.
3. Run a recording check.
4. If MPS fails, app should retry on CPU.
5. UI should show warning, not a fatal crash.

Expected warning:

```text
Whisper retried on CPU because Apple Silicon MPS failed for this model.
```

### Regression tests

Run:

```bash
python -m unittest tests.test_stt_providers
npm --prefix backend test
npm --prefix frontend run build
./scripts/run_all_tests.sh
```

If any tests fail because defaults changed from `auto` to `cpu`, update the expected macOS default only. Do not weaken unrelated tests.

---

## Acceptance Criteria

The task is complete only if all of the following are true:

- Clean macOS install starts successfully.
- `run_mac.command` does not default to unsafe MPS.
- A beginner can complete one recording check without seeing `SparseMPS`.
- MPS is still available in Advanced Mode.
- MPS failure retries once on CPU.
- Fallback is visible in UI and result JSON.
- Docs mention CPU default and MPS experimental fallback.
- Tests/build pass.

---

## Commit Message

Use:

```bash
git commit -m "Stabilize macOS Whisper device fallback"
```
