# Codex Task Addendum: Fix FFmpeg Missing Detection and Installation on macOS and Windows

## Goal

Fix the issue where the app / System Check reports:

```text
FFmpeg: Missing
```

on both macOS and Windows, even after running the setup scripts.

This should be fixed together with the macOS Whisper device stability issue. The final beginner install flow should make FFmpeg available reliably, or clearly guide the user through installation when automatic installation is not possible.

---

## Current Problem

During clean install testing, the app can start successfully, but System Check may report:

```text
FFmpeg: Missing
```

on both:

```text
macOS
Windows
```

This is a blocker for beginner users because FFmpeg is required for recording conversion and audio preprocessing.

The app should not silently continue with unclear FFmpeg state.

---

## Required Behavior

### 1. Detect FFmpeg correctly

FFmpeg detection should check whether this command works:

```bash
ffmpeg -version
```

Detection should work from the same environment used by the backend / launcher, not only from the user's interactive shell.

Check these files:

```text
scripts/doctor.js
backend/server.js
setup_mac.command
setup_windows.ps1
run_mac.command
run_windows.bat
run_web_app.sh
run_web_app.ps1
```

Expected behavior:

- If FFmpeg exists in PATH, System Check shows `FFmpeg: OK`.
- If FFmpeg is bundled or found in a known local path, System Check shows `FFmpeg: OK`.
- If FFmpeg is missing, System Check shows a clear install command.

---

### 2. macOS setup should install or clearly validate FFmpeg

For macOS, update `setup_mac.command` so it:

1. Checks:

```bash
command -v ffmpeg
ffmpeg -version
```

2. If FFmpeg is missing, checks whether Homebrew exists:

```bash
command -v brew
```

3. If Homebrew exists, install FFmpeg:

```bash
brew install ffmpeg
```

4. After installation, re-check:

```bash
command -v ffmpeg
ffmpeg -version
```

5. If Homebrew is missing, show a clear beginner-friendly message:

```text
FFmpeg is required but was not found.
Please install Homebrew from https://brew.sh, then run:
brew install ffmpeg
After that, re-run setup_mac.command.
```

Do not mark setup as fully successful if FFmpeg is still missing.

---

### 3. macOS PATH issue

A common macOS issue is that Finder-launched `.command` files may not have the same PATH as the user's interactive terminal.

Add common Homebrew paths before checking FFmpeg:

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
```

This is important for Apple Silicon Macs because Homebrew usually installs FFmpeg at:

```text
/opt/homebrew/bin/ffmpeg
```

Intel macOS often uses:

```text
/usr/local/bin/ffmpeg
```

Make sure `run_mac.command` and `setup_mac.command` both include these PATH entries.

---

### 4. Windows setup should install or clearly validate FFmpeg

For Windows, update `setup_windows.ps1` so it:

1. Checks:

```powershell
Get-Command ffmpeg -ErrorAction SilentlyContinue
ffmpeg -version
```

2. If FFmpeg is missing, attempts installation through winget:

```powershell
winget install --id Gyan.FFmpeg -e --source winget
```

3. After install, refresh PATH for the current PowerShell session if possible.

Suggested locations to check after install:

```text
C:\Program Files\ffmpeg\bin\ffmpeg.exe
C:\ProgramData\chocolatey\bin\ffmpeg.exe
%LOCALAPPDATA%\Microsoft\WinGet\Packages
```

4. If winget is unavailable or installation fails, show clear beginner-friendly instructions:

```text
FFmpeg is required but was not found.
Install FFmpeg with one of these methods:
1. winget install --id Gyan.FFmpeg -e --source winget
2. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/
Then restart PowerShell and run setup_windows.ps1 again.
```

Do not mark setup as fully successful if FFmpeg is still missing.

---

### 5. Windows PATH issue

After installing FFmpeg on Windows, a new PowerShell window may be required before `ffmpeg` is visible.

Improve setup instructions:

- If FFmpeg was installed during setup but still not detected:
  - tell the user to close and reopen PowerShell
  - re-run `setup_windows.ps1`
  - or restart the computer if PATH is not refreshed

If possible, update PATH inside the current script session after winget install by reading machine/user Path environment variables again.

Example:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

---

### 6. Backend should expose FFmpeg status clearly

Update backend diagnostic endpoint / System Check response to include:

```json
{
  "ffmpeg": {
    "status": "ok",
    "path": "/opt/homebrew/bin/ffmpeg",
    "version": "ffmpeg version ..."
  }
}
```

or if missing:

```json
{
  "ffmpeg": {
    "status": "missing",
    "path": null,
    "message": "FFmpeg is required for audio conversion."
  }
}
```

The frontend should show:

```text
FFmpeg: OK
```

or:

```text
FFmpeg: Missing
Install command:
macOS: brew install ffmpeg
Windows: winget install --id Gyan.FFmpeg -e --source winget
```

---

### 7. Runtime should fail early with clear message if FFmpeg is missing

If the user tries to check a recording and FFmpeg is missing, do not allow a confusing backend crash.

Instead show:

```text
FFmpeg is missing. Please install FFmpeg and restart the app.
```

Include platform-specific instructions:

macOS:

```bash
brew install ffmpeg
```

Windows PowerShell:

```powershell
winget install --id Gyan.FFmpeg -e --source winget
```

---

### 8. Add tests

Add or update tests for FFmpeg detection if the repo already has backend / doctor tests.

Suggested test cases:

1. FFmpeg exists in PATH.
2. FFmpeg missing from PATH.
3. macOS Homebrew path `/opt/homebrew/bin` is included.
4. Windows detection uses `Get-Command ffmpeg`.
5. System Check returns structured FFmpeg status.

Do not require FFmpeg to be actually installed in CI unless the existing CI already installs it. Mock detection if needed.

---

### 9. Update documentation

Update:

```text
README.md
README_en.md
README_BEGINNER.md
README_BEGINNER_zh-TW.md
MANUAL_QA.md
RELEASE_NOTES.md
```

Add a clear FFmpeg section.

Traditional Chinese text:

```md
### FFmpeg

FFmpeg 是必要工具，用來轉換與處理錄音。如果 System Check 顯示 `FFmpeg: Missing`，請先安裝 FFmpeg，然後重新啟動 App。

macOS：

```bash
brew install ffmpeg
```

Windows PowerShell：

```powershell
winget install --id Gyan.FFmpeg -e --source winget
```

Windows 安裝後如果仍顯示 Missing，請關閉 PowerShell / App，重新開啟後再執行一次 setup。
```

English text:

```md
### FFmpeg

FFmpeg is required for recording conversion and audio preprocessing. If System Check shows `FFmpeg: Missing`, install FFmpeg and restart the app.

macOS:

```bash
brew install ffmpeg
```

Windows PowerShell:

```powershell
winget install --id Gyan.FFmpeg -e --source winget
```

On Windows, if FFmpeg still appears as missing after installation, close PowerShell / the app, reopen it, and run setup again so PATH is refreshed.
```

---

## Manual QA

### macOS clean install

```bash
cd /Users/bladeruuner/PycharmProjects
rm -rf whisper_learning_test_install

git clone -b cross-platform-native-stt https://github.com/codewriterrussian/whisper_learning.git whisper_learning_test_install
cd whisper_learning_test_install

chmod +x setup_mac.command run_mac.command run_web_app.sh scripts/*.sh
./setup_mac.command
./run_mac.command
```

Expected:

- setup checks FFmpeg.
- if FFmpeg exists, setup says FFmpeg OK.
- if FFmpeg missing and Homebrew exists, setup installs FFmpeg.
- if FFmpeg missing and Homebrew missing, setup stops with clear message.
- System Check shows `FFmpeg: OK`.

### Windows clean install

In PowerShell:

```powershell
git clone -b cross-platform-native-stt https://github.com/codewriterrussian/whisper_learning.git whisper_learning_test_install
cd whisper_learning_test_install

.\setup_windows.ps1
.\run_windows.bat
```

Expected:

- setup checks FFmpeg.
- if FFmpeg exists, setup says FFmpeg OK.
- if missing and winget exists, setup attempts installation.
- if PATH needs refresh, setup tells user to reopen PowerShell.
- System Check shows `FFmpeg: OK`.

### Runtime recording test

1. Open the app.
2. Record one attempt.
3. Click Check Selected Recording.
4. Confirm audio conversion succeeds.
5. Confirm no vague FFmpeg-related backend crash occurs.

---

## Acceptance Criteria

The task is complete only if:

- macOS System Check no longer falsely reports FFmpeg missing when `/opt/homebrew/bin/ffmpeg` exists.
- Windows System Check no longer falsely reports FFmpeg missing when `ffmpeg.exe` is installed and available.
- Setup scripts clearly install or validate FFmpeg.
- Runtime shows clear platform-specific instructions if FFmpeg is missing.
- Beginner README explains FFmpeg installation in Traditional Chinese and English.
- Manual QA steps pass on macOS and Windows.
- This fix is compatible with the macOS Whisper CPU-default / MPS fallback fix.

---

## Suggested Commit Message

```bash
git commit -m "Improve FFmpeg detection and setup guidance"
```
