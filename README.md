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

A local-first pronunciation practice app.

Record your speech, check it with OpenAI Whisper, and review word accuracy, fluency, and feedback.

本工具是本機優先的發音練習 App。你可以錄下自己的朗讀，用 OpenAI Whisper 檢查辨識結果，並查看單字準確率、流暢度與回饋。

---

## Start Here

New users should start with the beginner guide:

- [Beginner English guide](README_BEGINNER.md)
- [初學者繁體中文指南](README_BEGINNER_zh-TW.md)

Technical users can read the full manuals:

- [Full English technical manual](README_en.md)
- [完整繁體中文技術文件](README_zh-TW.md)

---

## Quick Start

### macOS

1. Double-click `setup_mac.command` once.
2. Double-click `run_mac.command`.
3. If the browser does not open, go to:

```text
http://localhost:6173
```

### Windows

1. Right-click `setup_windows.ps1`.
2. Choose **Run with PowerShell**.
3. Double-click `run_windows.bat`.

The first launch or first recording check may be slow because Whisper may need to download, load, or warm up the model.

---

## 快速開始

### macOS

1. 雙擊 `setup_mac.command` 一次。
2. 雙擊 `run_mac.command`。
3. 如果瀏覽器沒有自動開啟，請前往：

```text
http://localhost:6173
```

### Windows

1. 右鍵點擊 `setup_windows.ps1`。
2. 選擇 **Run with PowerShell**。
3. 雙擊 `run_windows.bat`。

第一次啟動或第一次檢查錄音可能比較慢，因為 Whisper 可能需要下載、載入或 warm up 模型。

---

## What It Does / 功能

- Listen to model audio / 聽範例語音
- Record your voice / 錄音
- Check transcript with OpenAI Whisper / 用 OpenAI Whisper 檢查語音辨識
- Show word accuracy, fluency, and feedback / 顯示單字準確率、流暢度與回饋
- Optional Apple STT comparison on macOS / macOS 可選用 Apple STT 比較

---

## Defaults / 預設行為

| Platform | Default provider | Default device |
| --- | --- | --- |
| Apple Silicon macOS | OpenAI Whisper + Apple STT comparison | MPS |
| Intel macOS | OpenAI Whisper + Apple STT comparison | CPU |
| Windows | OpenAI Whisper only | CPU |
| Linux | OpenAI Whisper only | CPU |

Default Whisper backend: **OpenAI Whisper**

Default Whisper model: **`large-v3-turbo`**

預設 Whisper backend 是 **OpenAI Whisper**；預設模型是 **`large-v3-turbo`**。

---

## macOS Apple STT Permission

Apple STT is optional and experimental. Whisper remains the main scoring provider.

Browser microphone permission is different from macOS Speech Recognition permission.

Open:

```text
System Settings → Privacy & Security → Speech Recognition
```

Enable the app that launched the backend:

- Double-click `run_mac.command` or Terminal launch → enable **Terminal**
- VS Code terminal → enable **Visual Studio Code**
- PyCharm terminal → enable **PyCharm**

After changing permission, restart `run_mac.command`.

Optional check:

```bash
./scripts/check_apple_stt.sh
```

If Apple STT is blocked, the app can still show Whisper results and scores.

---

## macOS Apple STT 權限

Apple STT 是選用與實驗性功能。Whisper 仍然是主要評分來源。

瀏覽器麥克風權限和 macOS Speech Recognition 權限不同。

請打開：

```text
System Settings → Privacy & Security → Speech Recognition
```

啟用負責啟動 backend 的 App：

- 雙擊 `run_mac.command` 或從 Terminal 啟動 → 啟用 **Terminal**
- 從 VS Code terminal 啟動 → 啟用 **Visual Studio Code**
- 從 PyCharm terminal 啟動 → 啟用 **PyCharm**

修改權限後，請重新啟動 `run_mac.command`。

可選檢查：

```bash
./scripts/check_apple_stt.sh
```

如果 Apple STT 被阻擋，App 仍然可以顯示 Whisper 結果與分數。

---

## Performance Note / 效能提醒

Apple Silicon MPS was much faster than CPU on the tested local machine, but actual speed depends on hardware, audio length, model cache state, macOS, Python, and PyTorch versions.

在測試的 Apple Silicon macOS 機器上，MPS 明顯比 CPU 快；但實際速度會受到硬體、錄音長度、模型是否已 warm up、macOS、Python 與 PyTorch 版本影響。

---

## Privacy / 隱私

Recordings are processed locally by default.

預設情況下，錄音會在你的電腦本機處理。

Optional Colab mode sends audio to a remote runtime. Do not use it for private recordings.

選用的 Colab 模式會把音訊送到遠端 runtime。請不要用它處理私人錄音。

Generated recordings, transcripts, runs, results, `model_audio`, and generated reports are local output files and should not be committed.

---

## More Docs / 更多文件

- [README_en.md](README_en.md) — full English technical manual
- [README_zh-TW.md](README_zh-TW.md) — 完整繁體中文技術文件
- [README_BEGINNER.md](README_BEGINNER.md) — beginner English guide
- [README_BEGINNER_zh-TW.md](README_BEGINNER_zh-TW.md) — 初學者繁體中文指南
- [RELEASE_NOTES.md](RELEASE_NOTES.md)
- [MANUAL_QA.md](MANUAL_QA.md)
