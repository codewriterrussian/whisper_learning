<!-- Language Switcher -->
<p align="right">
  <a href="./README_BEGINNER.md">English</a> |
  <a href="./README_BEGINNER_zh-TW.md">繁體中文</a>
</p>

# Whisper Speaking Practice：從這裡開始

這份指南是給「不會寫程式」的使用者看的。

你不需要懂 Python、Node.js、npm、FFmpeg、Whisper、CUDA 或 MPS，也可以使用這個 App。

---

## 這個 App 可以做什麼？

Whisper Speaking Practice 可以幫助你練習發音。

你可以：

1. 選擇一個練習語言。
2. 選擇或輸入一句目標句子。
3. 聽範例語音。
4. 錄下自己的聲音。
5. 取得回饋。

App 會提供：

- 分數
- 語音辨識結果 transcript
- 單字比對
- 發音提示
- 流暢度與節奏回饋
- 練習歷史紀錄

預設情況下，你的錄音會在自己的電腦上檢查。

---

## 最短使用方式

### macOS

1. 打開這個 App 資料夾。
2. 雙擊 `setup_mac.command`。
3. 等到畫面顯示 setup finished。
4. 雙擊 `run_mac.command`。
5. 瀏覽器應該會自動打開 App。

---

### Windows

1. 打開這個 App 資料夾。
2. 右鍵點擊 `setup_windows.ps1`。
3. 點選 **Run with PowerShell**。
4. 等到畫面顯示 setup finished。
5. 雙擊 `run_windows.bat`。
6. 瀏覽器應該會自動打開 App。

---

## 成功啟動時會看到什麼？

如果 App 正常啟動，你會看到：

- 瀏覽器視窗打開
- 頁面標題顯示 **Whisper Speaking Practice**
- 看到 **Practice language**
- 看到 **Target sentence**
- 看到 **Start Recording**
- 看到 **Check Selected Recording**

App 也可能會打開一個或兩個 command windows。這是正常的。

使用 App 時，請不要關閉這些 command windows。

如果你要停止 App，關掉這些 command windows 即可。

---

## macOS Whisper 裝置設定

在 macOS Apple Silicon 上，本工具預設使用 MPS 執行 OpenAI Whisper，讓本機檢查速度更快。

Intel macOS、Windows、Linux 預設使用 CPU。Apple Silicon 也可以在 Advanced Mode 手動改用 CPU。

---

## 開始之前

這個 App 需要電腦上有幾個輔助工具。

安裝腳本會幫你檢查：

- Python：用來執行語音工具
- Node.js：用來執行 Web App
- FFmpeg：用來處理你的錄音
- Whisper：用來檢查你的語音

如果缺少某個工具，setup script 或 System Check 會告訴你要安裝什麼。

---

## macOS 詳細步驟

1. 把 App 資料夾放在簡單的位置，例如 **Documents**。
2. 用 Finder 打開 App 資料夾。
3. 雙擊 `setup_mac.command`。
4. 如果 macOS 阻擋它，請右鍵點擊 `setup_mac.command`，選擇 **Open**，再選擇一次 **Open**。
5. 等待安裝完成。安裝可能需要幾分鐘。
6. 安裝完成後，雙擊 `run_mac.command`。
7. 瀏覽器應該會自動打開。

如果 setup 顯示缺少工具：

- Python：請安裝 Python。
- Node.js：請安裝 Node.js LTS 版本。
- FFmpeg：請先安裝 Homebrew，再透過 Homebrew 安裝 FFmpeg。

macOS 上安裝 FFmpeg 的 Homebrew 指令是：

```bash
brew install ffmpeg
```

如果你不知道怎麼使用這個指令，可以請懂技術的人幫你安裝 FFmpeg 一次。

安裝完成後，之後你就可以正常使用 App。

---

## Windows 詳細步驟

1. 把 App 資料夾放在簡單的位置，例如 **Documents**。
2. 用 File Explorer 打開 App 資料夾。
3. 右鍵點擊 `setup_windows.ps1`。
4. 點選 **Run with PowerShell**。
5. 等待安裝完成。安裝可能需要幾分鐘。
6. 安裝完成後，雙擊 `run_windows.bat`。
7. 瀏覽器應該會自動打開。

如果 PowerShell 阻擋 setup script：

1. 打開 Start menu。
2. 搜尋 **PowerShell**。
3. 打開 PowerShell。
4. 貼上這行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

5. 按 Enter。
6. 如果 Windows 要求確認，輸入 `Y`。
7. 再重新執行 `setup_windows.ps1`。

如果 setup 顯示缺少工具：

- Python：請安裝 Python。
- Node.js：請安裝 Node.js LTS 版本。
- FFmpeg：可以用下面的 Windows 指令安裝：

```powershell
winget install Gyan.FFmpeg
```

Windows 安裝 Python 時請注意：

如果你看到 **Add Python to PATH** 選項，請把它勾起來。

---

## 第一次啟動可能比較慢

第一次檢查錄音時，App 可能會下載語音辨識模型。

這可能需要一些時間，這是正常現象。

預設本機 Whisper 模型是 `large-v3-turbo`。Apple Silicon Mac 預設使用 MPS；Intel Mac、Windows、Linux 預設使用 CPU。

第一次啟動或第一次檢查錄音可能比較慢，因為 Whisper 正在下載、載入或 warmup。之後的檢查通常會比較快。

macOS 支援時可以使用 Whisper + Apple STT comparison。Apple STT 可能先回傳，Whisper 的分數可能稍後才出現。

Apple STT 需要 macOS Speech Recognition 權限。請到 **System Settings -> Privacy & Security -> Speech Recognition**，啟用用來啟動 backend 的 App，例如 Terminal、iTerm、PyCharm、VS Code，或 command launcher。改完權限後，請重新啟動 `run_mac.command`。

如果 Apple STT 失敗或被 macOS 阻擋，Whisper 仍然可以正常評分。在 Whisper + Apple STT 模式中，Apple STT 是選用的診斷比較來源，Whisper 仍是主要評分 provider。

---

## 麥克風權限

當瀏覽器詢問是否允許使用麥克風時，請點選 **Allow**。

如果你點了 **Block**，App 就不能錄你的聲音。

如果錄音不能正常使用，請檢查：

- 重新整理頁面。
- 檢查瀏覽器的麥克風權限。
- 在 **Microphone** 下拉選單選擇正確的麥克風。

---

## 如何使用 App？

1. 選擇練習語言。
2. 閱讀目標句子。
3. 點擊 **Listen / Generate** 聽範例聲音。
4. 點擊 **Start Recording**。
5. 念出句子。
6. 停止錄音。
7. 選擇你想檢查的錄音 attempt。
8. 點擊 **Check Selected Recording**。
9. 閱讀分數與 teacher feedback。
10. 再練習一次。

---

## Simple Mode 與 Advanced Mode

如果你是新使用者，建議留在 **Simple Mode**。

Simple Mode 只會顯示：

- Accuracy mode：Recommended 或 Fast
- Native comparison：Off，或在可用時顯示 On
- System Check

只有當你熟悉技術設定時，才建議使用 **Advanced Mode**。

Advanced Mode 會顯示模型名稱與 device 選項。Apple Silicon Mac 應該預設顯示 MPS；Intel Mac、Windows、Linux 應該預設顯示 CPU。

大部分初學者不需要使用 Advanced Mode。

---

## System Check

在 App 中點擊：

```text
Settings -> System Check
```

System Check 會告訴你 App 是否具備需要的工具。

它會顯示簡單狀態：

- OK
- Missing

如果有東西缺少，它會提供簡短修正方式。

更技術性的細節會被收在 **Advanced details** 裡面。

---

## 常見問題

| 你看到的情況 | 代表什麼 | 要怎麼做 |
| --- | --- | --- |
| Python is missing | 語音工具還不能執行。 | 安裝 Python 3.10 或更新版本。 |
| Node.js/npm is missing | Web App 還不能啟動。 | 安裝 Node.js LTS。 |
| FFmpeg is missing | App 還不能處理音訊。 | 安裝 FFmpeg。 |
| Whisper is missing | 語音檢查器還沒安裝。 | 重新執行 setup script。 |
| Browser asks for microphone access | App 需要權限才能錄音。 | 點擊 Allow。 |
| First check is very slow | 語音模型正在載入或下載。 | 等待完成；之後通常會比較快。 |
| Apple STT is skipped | Apple Speech 在 macOS 上是選用功能。 | 可以忽略，使用 Whisper 即可。 |
| Apple STT 被 macOS 阻擋 | 啟動 backend 的 App 缺少 Speech Recognition 權限。 | 到 System Settings -> Privacy & Security -> Speech Recognition 啟用 Terminal、iTerm、PyCharm、VS Code 或 command launcher，然後重開 `run_mac.command`。 |
| Native comparison is skipped on Windows | Windows 預設使用 Whisper。 | 這是正常現象。 |
| App opens command windows | App 正在你的電腦本機執行。 | 使用 App 時請保持它們開著。 |
| Browser does not open | App 可能還在啟動中。 | 手動打開 `http://localhost:6173`。 |

---

## 隱私

預設情況下，錄音會留在你的電腦上。

不要用選用的 Colab Whisper mode 處理私人錄音，因為它會把音訊送到遠端 Google Colab runtime。

---

## 給技術使用者

主要的 [README.md](README.md) 包含：

- 開發者安裝方式
- command-line 使用方式
- 環境變數
- 測試方式
- 進階 STT provider 資訊
