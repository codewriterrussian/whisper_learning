<!-- Documentation Navigation -->
<p align="right">
  Full docs:
  <a href="./README_en.md">English</a> |
  <a href="./README_zh-TW.md">繁體中文</a>
  <br>
  Beginner:
  <a href="./README_BEGINNER.md">English</a> |
  <a href="./README_BEGINNER_zh-TW.md">繁體中文</a>
</p>

# Whisper Speaking Practice

Local-first pronunciation practice app. Record your speech, check it with OpenAI Whisper, and review word accuracy, fluency, and feedback.

本工具是本機優先的發音練習 App。你可以錄下自己的朗讀，用 OpenAI Whisper 檢查辨識結果，並查看單字準確率、流暢度與回饋。

## Start Here / 從這裡開始

English:

- New users: [README_BEGINNER.md](README_BEGINNER.md)
- Technical details: [README_en.md](README_en.md)

繁體中文:

- 新使用者：[README_BEGINNER_zh-TW.md](README_BEGINNER_zh-TW.md)
- 技術細節：[README_zh-TW.md](README_zh-TW.md)

## What It Does / 功能

- Listen to model audio / 聽範例語音
- Record your voice / 錄音
- Check transcript with OpenAI Whisper / 用 OpenAI Whisper 檢查語音辨識
- Show word accuracy and feedback / 顯示單字準確率與回饋
- Optional Apple STT comparison on macOS / macOS 可選用 Apple STT 比較

## Quick Start / 快速開始

### macOS

- Double-click `setup_mac.command` once.
  雙擊 `setup_mac.command` 一次。
- Double-click `run_mac.command`.
  雙擊 `run_mac.command`。
- If the browser does not open, go to `http://localhost:6173`.
  如果瀏覽器沒有自動開啟，請前往 `http://localhost:6173`。

### Windows

- Right-click `setup_windows.ps1` and choose **Run with PowerShell**.
  右鍵點擊 `setup_windows.ps1`，選擇 **Run with PowerShell**。
- Double-click `run_windows.bat`.
  雙擊 `run_windows.bat`。

## Defaults / 預設行為

| Platform | Default provider | Default device |
| --- | --- | --- |
| Apple Silicon macOS | OpenAI Whisper + Apple STT comparison | MPS |
| Intel macOS | OpenAI Whisper + Apple STT comparison | CPU |
| Windows | OpenAI Whisper only | CPU |
| Linux | OpenAI Whisper only | CPU |

Default Whisper backend: OpenAI Whisper

Default Whisper model: `large-v3-turbo`

預設 Whisper backend 是 OpenAI Whisper；預設模型是 `large-v3-turbo`。

## macOS Apple STT Permission / macOS Apple STT 權限

- Apple STT is optional and experimental.
- Whisper remains the main scoring provider.
- Browser microphone permission is different from macOS Speech Recognition permission.
- Apple STT 是選用功能；如果被 macOS 權限阻擋，Whisper 仍然可以正常評分。

Permission path / 權限位置:

```text
System Settings → Privacy & Security → Speech Recognition
```

Enable the app that launched the backend / 啟用負責啟動 backend 的 App:

- Terminal for double-click `run_mac.command` / Terminal.
- Visual Studio Code for VS Code terminal.
- PyCharm for PyCharm terminal.

After changing permission, restart `run_mac.command`.

修改權限後，請重新啟動 `run_mac.command`。

Optional check / 可選檢查:

```bash
./scripts/check_apple_stt.sh
```

## Privacy / 隱私

- Recordings are processed locally by default.
- Optional Colab mode sends audio to a remote runtime.
- Do not commit generated recordings, transcripts, runs, results, `model_audio`, or generated reports.

## More Docs / 更多文件

- [README_en.md](README_en.md) — full English technical manual
- [README_zh-TW.md](README_zh-TW.md) — 完整繁體中文技術文件
- [README_BEGINNER.md](README_BEGINNER.md) — beginner English guide
- [README_BEGINNER_zh-TW.md](README_BEGINNER_zh-TW.md) — 初學者繁體中文指南
- [RELEASE_NOTES.md](RELEASE_NOTES.md)
- [MANUAL_QA.md](MANUAL_QA.md)
