<!-- Language Switcher -->
<p align="right">
  <a href="./README_en.md">English</a> |
  <a href="./README.md">繁體中文</a>
</p>

# Whisper Speaking Practice（繁體中文版）

這是一個以「本機優先（local-first）」為設計核心的發音練習工具。使用者可以聽範例語音、錄下自己的朗讀、透過語音轉文字（STT）檢查辨識結果、計算單字準確率，並查看流暢度與節奏回饋。

> 這個版本是「原始碼型的本機工具」，不是已經部署好的線上服務。

如果你是完全沒有程式背景的新使用者，建議先看：

👉 [初學者繁體中文指南](README_BEGINNER_zh-TW.md)

該文件提供比較簡單的雙擊安裝、啟動方式、麥克風權限設定與常見問題排除。

---

## 1. 這個 App 可以做什麼？

Whisper Speaking Practice 可以幫助使用者練習外語發音，主要流程如下：

1. 選擇練習語言。
2. 輸入或選擇目標句子。
3. 聽範例語音。
4. 錄下自己的聲音。
5. 使用 STT 檢查錄音內容。
6. 比較目標句子與辨識結果。
7. 查看準確率、單字比對、流暢度與節奏回饋。
8. 保留練習紀錄，方便之後複習。

目前推薦的主要 STT 方案是 Whisper。

---

## 2. 平台預設行為

不同作業系統的預設 STT 設定如下：

| 平台 | 預設 STT 模式 | 說明 |
| --- | --- | --- |
| macOS | Whisper + Apple STT | Whisper 是主要評分來源；Apple STT 作為 macOS 原生比較來源 |
| Windows | Whisper only | Windows 預設只使用 Whisper |
| Linux | Whisper only | Linux 預設只使用 Whisper |
| 選用遠端模式 | Google Colab GPU Whisper Worker | 實驗性功能，用於遠端 GPU Whisper 比對 |

macOS 的 Apple STT 是選用與實驗性功能；如果失敗或被跳過，仍然可以正常使用 Whisper。

### macOS Whisper 裝置設定

在 macOS Apple Silicon 上，本工具預設使用 CPU 執行 Whisper。CPU 速度可能比 MPS 慢，但對初學者與第一次安裝測試更穩定。

MPS 仍可在 Advanced Mode 中手動選擇。不過部分 PyTorch / Whisper 組合可能遇到 SparseMPS 錯誤。如果 MPS 失敗，App 會自動改用 CPU 重試一次，避免整個檢查流程中斷。

---

## 3. 快速安裝方式

repo 根目錄提供給初學者使用的啟動腳本。

### macOS

1. 打開 repo 資料夾。
2. 雙擊：

```text
setup_mac.command
```

3. 安裝完成後，雙擊：

```text
run_mac.command
```

4. 瀏覽器應該會自動開啟 App。

如果 macOS 擋住 `.command` 檔案，可以右鍵點擊檔案，選擇「打開」，再確認一次「打開」。

### Windows

1. 打開 repo 資料夾。
2. 右鍵點擊：

```text
setup_windows.ps1
```

3. 選擇：

```text
Run with PowerShell
```

4. 安裝完成後，雙擊：

```text
run_windows.bat
```

5. 瀏覽器應該會自動開啟 App。

如果 Windows 阻擋 PowerShell 腳本，請打開 PowerShell，執行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

如果系統要求確認，輸入 `Y`，再重新執行 `setup_windows.ps1`。

---

## 4. 安裝腳本會做什麼？

安裝腳本會嘗試完成以下工作：

1. 檢查 Python 是否存在。
2. 檢查 FFmpeg 是否存在。
3. 建立 Python 虛擬環境 `.venv`。
4. 更新 pip。
5. 安裝 Python 套件，例如 `openai-whisper`。
6. 安裝 backend 的 npm 套件。
7. 安裝 frontend 的 npm 套件。

注意事項：

- macOS 自動安裝 Python / FFmpeg 通常需要 Homebrew。
- Windows 自動安裝 Python / FFmpeg 通常需要 `winget`。
- Whisper 模型會在第一次需要時自動下載。
- 第一次下載模型可能會花比較久，也需要足夠磁碟空間。

---

## 5. 手動安裝需求

以下內容比較適合開發者或需要手動排錯的使用者。

建議需求：

- Python 3.10 或 3.11
- Node.js 20 或更新版本
- `ffmpeg` 可以在 `PATH` 中被找到
- 足夠磁碟空間下載 Whisper 模型

Whisper 模型大約大小：

| 模型 | 大約下載大小 |
| --- | --- |
| `medium` | 約 1.5 GB |
| `large` | 約 3 GB |
| `large-v3` | 約 3 GB |
| `large-v3-turbo` | 約 1.5 GB |

---

## 6. 手動建立 Python 環境

macOS / Linux 可使用：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
```

Windows 可使用：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt
```

---

## 7. 安裝 JavaScript 相依套件

在 repo 根目錄執行：

```bash
(cd backend && npm install)
(cd frontend && npm install)
```

Windows PowerShell 也可以分別進入資料夾執行：

```powershell
cd backend
npm install
cd ../frontend
npm install
cd ..
```

---

## 8. 安裝 FFmpeg

### macOS

```bash
brew install ffmpeg
```

### Windows

```powershell
winget install Gyan.FFmpeg
```

### Ubuntu / Debian Linux

```bash
sudo apt update
sudo apt install ffmpeg
```

---

## 9. 啟動 Web App

### macOS / Linux

```bash
./run_web_app.sh
```

### Windows PowerShell

```powershell
.\run_web_app.ps1
```

啟動後打開：

```text
http://localhost:6173
```

backend 預設會跑在：

```text
http://localhost:6174
```

---

## 10. 隱私與本機資料

預設情況下，錄音會由你電腦上的 backend 在本機處理，不會上傳到託管伺服器。

資料儲存位置：

- 瀏覽器端會儲存本機練習紀錄。
- backend 產生的檔案會放在：

```text
runs/<attemptId>/
```

每次 Web 檢查可能產生：

```text
runs/<attemptId>/original.webm
runs/<attemptId>/input.wav
runs/<attemptId>/input.auto_trimmed.wav
runs/<attemptId>/target.txt
runs/<attemptId>/transcript.txt
runs/<attemptId>/transcript.whisper.txt
runs/<attemptId>/transcript.apple.txt
runs/<attemptId>/transcript.colab_whisper.txt
runs/<attemptId>/comparison.txt
runs/<attemptId>/result.json
```

若要清除本機產生資料與瀏覽器練習紀錄，可以使用 Practice history 面板中的：

```text
Clear history and local runs
```

也可以使用腳本清除。

macOS / Linux：

```bash
./scripts/clear_local_data.sh
```

Windows：

```powershell
.\scripts\clear_local_data.ps1
```

---

## 11. Whisper STT

Whisper 是此 repo 的預設 STT provider。

預設模型是：

```text
large
```

原因是 `large` 對波蘭語與多語言發音練習通常比較可靠。

其他選項：

| 模型 | 用途 |
| --- | --- |
| `medium` | 速度較快，適合粗略檢查 |
| `large` | 預設嚴格檢查，準確率較好，但第一次啟動較慢 |
| `large-v3-turbo` | 如果目前安裝的 Whisper 支援，通常比 `large` 快很多 |

CLI 範例：

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider whisper \
  --language pl \
  --model large \
  --device auto \
  --fast-mode \
  --output transcripts/my_recording.txt
```

Shell helper：

```bash
./scripts/transcribe.sh recordings/my_recording.wav transcripts --language pl --model large --device auto
```

短錄音練習預設啟用 fast mode：

```text
beam_size=1
best_of=1
temperature=0
condition_on_previous_text=False
word_timestamps=False
```

若希望 backend 啟動時先預載 Whisper 模型：

```bash
WHISPER_WARMUP=1 ./run_web_app.sh
```

如果 `large-v3-turbo` 不被目前安裝的 `openai-whisper` 支援，可以選擇 `Strict Check - Large`，或更新 Whisper。backend 會回傳清楚的模型載入錯誤，不會偷偷改用其他模型。

---

## 12. 各平台行為細節

### macOS Apple Silicon

- 預設 provider mode：Whisper + Apple STT
- 可用 providers：Whisper、Apple STT、Whisper + Apple STT
- 可用 devices：`mps`、`cpu`、`auto`
- `auto` 會優先使用 MPS

### Windows

- 預設 provider mode：Whisper only
- 可用 providers：Whisper only；如果有設定，也可選用 Colab Whisper
- 可用 devices：`cuda`、`cpu`、`auto`
- `auto` 會優先使用 CUDA

### Linux

- 可用 providers：Whisper only
- 可用 devices：`cuda`、`cpu`、`auto`
- `auto` 會優先使用 CUDA
- Native STT 選項會被隱藏

### 選用 Colab

- Provider：Colab Whisper GPU - experimental
- 只有設定 `COLAB_STT_URL` 時才會出現
- 會把音訊傳送到你的遠端 Colab runtime 做 Whisper 轉錄
- 本機 App 仍然負責錄音、裁切、評分、result JSON、歷史紀錄與報告匯出

注意：

- MPS 不會在 macOS 以外的平台被選用。
- Native STT 失敗時會顯示 `failed`、`unavailable`、`invalid` 或 `skipped` 等狀態，不會假裝成 `0.0/100`。

---

## 13. Apple STT

Apple STT 只支援 macOS，而且目前屬於實驗性功能。

它透過一個由 Python 啟動的小型 Swift helper，使用 Apple 原生 Speech framework。

可能需要對啟動 backend 的 App 開啟「語音辨識」權限，例如：

- Terminal
- iTerm
- VS Code
- PyCharm

CLI 範例：

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider apple \
  --language pl \
  --output transcripts/my_recording.txt
```

---

## 14. 選用：Google Colab GPU Whisper Worker

Colab Whisper 是實驗性遠端功能。本機 App 仍然是預設與推薦流程。

只有在你想比較結果，或暫時使用遠端 GPU 加速 Whisper 轉錄時，才建議使用 Colab。

重要提醒：

- 使用 Colab 模式時，音訊會上傳到 Colab runtime。
- 不要用此模式處理私人或敏感錄音。
- 免費 Colab GPU 不保證可用。
- Colab session 可能斷線。
- public URL 每次 session 可能不同。

此 notebook 使用 Cloudflare Quick Tunnel。Quick Tunnel 會產生暫時性的 `trycloudflare.com` URL，將外部流量代理到 Colab localhost 上的 Flask service。

GitHub-friendly Colab link placeholder：

```text
https://colab.research.google.com/github/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/blob/main/notebooks/colab_whisper_worker.ipynb
```

使用步驟：

1. 在 Google Colab 打開：

```text
notebooks/colab_whisper_worker.ipynb
```

2. 啟用 GPU runtime。
3. 執行所有 cells。
4. 複製印出的 `/transcribe` public URL。
5. 在本機設定 `COLAB_STT_URL`。
6. 啟動本機 Web App。
7. 打開 Advanced STT settings，選擇：

```text
Colab Whisper GPU - experimental
```

macOS / Linux：

```bash
export COLAB_STT_URL="https://xxxxx/transcribe"
./run_web_app.sh
```

Windows PowerShell：

```powershell
$env:COLAB_STT_URL="https://xxxxx/transcribe"
.\run_web_app.ps1
```

選用 timeout 設定：

```bash
export COLAB_STT_TIMEOUT=120
```

Colab worker endpoint 接受 multipart audio，並可額外接收：

- `language`
- `model`
- `fastMode`

回傳 JSON 會包含：

- `status`
- `transcript`
- `model`
- `device`
- `timeSec`

如果 worker 不存在、斷線、逾時或回傳無效 JSON，App 會標記 Colab Whisper 為 unavailable / failed，不會顯示假的 `0.0/100`。

若 notebook 卡在：

```text
Starting Cloudflare tunnel...
```

而沒有印出 `trycloudflare.com` URL，請只重新執行 tunnel cell。

可以先在 Colab 檢查本機 worker health：

```python
requests.get("http://127.0.0.1:7860/health").json()
```

如果本機 health 正常，但 public URL 沒出現，問題通常在 Cloudflare tunnel，而不是 Whisper。

如果 notebook 已印出 `trycloudflare.com` URL，但 public `/health` 一開始因 DNS 或連線錯誤而失敗，可以等 30–60 秒後再試。Quick Tunnel 的 DNS 有時會短暫延遲。若仍失敗，重新執行 tunnel cell 取得新的暫時 URL。

---

## 15. Whisper + Apple STT 模式

在 macOS 上，`both` 模式會用同一段錄音平行檢查 Whisper 與 Apple STT：

```bash
python scripts/stt_model.py recordings/my_recording.wav \
  --stt-provider both \
  --language pl \
  --model large \
  --device auto \
  --output transcripts/my_recording.txt
```

輸出檔案會依 provider 分開：

```text
transcripts/my_recording.whisper.txt
transcripts/my_recording.apple.txt
transcripts/my_recording.colab_whisper.txt
```

Web App 會將每次檢查的錄音儲存在：

```text
runs/<attemptId>/
runs/<attemptId>/result.json
```

舊式固定資料夾：

```text
recordings/
transcripts/
results/
```

主要保留給 CLI workflow。

公開 release build 時，請不要 commit 以下內容：

- 錄音檔
- transcripts
- model audio
- generated reports
- `runs/` output

---

## 16. 常用環境變數

| Variable | Default | 用途 |
| --- | --- | --- |
| `PYTHON` | launcher 自動偵測 | backend STT / TTS 腳本使用的 Python executable；`run_web_app.sh` 會優先使用本機 `stt_whisper` Conda 環境 |
| `EDGE_TTS_PYTHON` | 同 `PYTHON` | 產生 target audio 使用的 Python executable |
| `WHISPER_MODEL` | `large` | 預設 Whisper 模型 |
| `WHISPER_DEVICE` | `auto` | Whisper device：`auto`、`cpu`、`mps`、`cuda` |
| `WHISPER_WARMUP` | launcher scripts 中為 `1` | backend 啟動時預載 Whisper 模型 |
| `WHISPER_RETRY_DEVICE` | `same` | Whisper 輸出無效時，使用 `same` 或 `cpu` 進行較安全的 retry |
| `COLAB_STT_URL` | 未設定 | 選用 Colab Whisper worker 的 public `/transcribe` URL |
| `COLAB_STT_TIMEOUT` | `120` | 遠端 Colab transcription timeout 秒數 |
| `STT_LANGUAGE_AUTO_OVERRIDE` | launcher scripts 中為 `0` | 預設保留 UI 選擇的 STT 語言；設為 `1` 時，可在 target text 明顯指向另一語言時覆蓋 UI 選擇 |
| `BACKEND_PORT` | `6174` | backend port |
| `FRONTEND_PORT` | `6173` | frontend port |
| `FRONTEND_HOST` | `127.0.0.1` | frontend host binding |
| `VITE_API_BASE` | `http://localhost:<BACKEND_PORT>` | frontend API base URL |
| `MAX_UPLOAD_MB` | `25` | 最大可接受錄音上傳大小 |

---

## 17. 效能預期

實際速度會受到以下因素影響：

- 使用的 Whisper 模型
- CPU / GPU 效能
- 模型是否已經 warm up
- 是否使用 MPS / CUDA

大致說明：

| 選項 | 說明 |
| --- | --- |
| `medium` | 速度較快，適合粗略檢查；對波蘭語與多語發音可能較不可靠 |
| `large` | 預設嚴格檢查；較可靠，但 cold start 較慢 |
| `large-v3-turbo` | 若目前 Whisper 支援，通常比 `large` 快很多 |
| Apple Silicon MPS | 可加速 macOS 上的 Whisper，但仍支援 CPU fallback |
| NVIDIA CUDA | Windows / Linux 若 PyTorch CUDA build 支援，可加速 Whisper |
| AMD GPU on Windows | 此 repo 通常會 fallback 到 CPU |

---

## 18. 練習功能

Web App 目前保留以下功能：

- 產生與播放 target audio
- 最多保留 10 次錄音 attempts
- 選擇指定 attempt 進行檢查
- 手動裁切與自動靜音裁切
- Whisper 對無效 transcript 的 retry
- provider 狀態與無效 transcript 驗證
- Word accuracy
- Fluency / Timing Match
- Teacher feedback
- Practice history
- Export Practice Report

檢查進行中時，右側結果面板會顯示分階段進度，例如：

- audio preparation
- auto-trim
- WAV conversion
- Whisper
- optional native STT
- comparison
- fluency / timing
- feedback
- history saving

backend logs 會包含每個步驟的時間與 attempt ID。

---

## 19. 範例練習句子

### English

```text
Today I will practice speaking clearly, slowly, and with natural rhythm.
```

### Polish

```text
Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm.
```

### Vietnamese

```text
Hôm nay tôi luyện nói rõ ràng, chậm rãi và có nhịp điệu tự nhiên.
```

### German

```text
Heute übe ich deutliches Sprechen, langsames Tempo und natürlichen Rhythmus.
```

---

## 20. 常見問題排除

### macOS 啟動問題

一般 macOS 使用者可以直接執行：

```bash
./run_web_app.sh
```

launcher 選擇 Python 的順序大致如下：

1. 使用者指定的 `PYTHON`
2. repo 本地 `.venv`
3. 常見使用者層級 Conda / Miniforge 環境
4. `PATH` 上的 `python3` 或 `python`

如果選到錯誤 Python，可以指定：

```bash
PYTHON=/path/to/env/bin/python ./run_web_app.sh
```

如果缺少相依套件，launcher 會提早停止，並印出目前選到的 Python 與缺少的 packages。

---

### Whisper 模型下載很慢

第一次使用會下載模型權重。請保持 terminal 開啟，直到下載完成。

若 `large` 太慢，可以先用：

- `large-v3-turbo`
- `medium`

---

### MPS 不可用

MPS 只支援 macOS Apple Silicon。

如果你使用的是 Intel macOS、Windows 或 Linux，請使用：

```text
auto
```

或：

```text
cpu
```

---

### Apple Speech 權限失敗

請啟用「啟動 backend 的 App」的 Speech Recognition 權限，而不是只看瀏覽器。

可能需要設定權限的 App：

- Terminal
- iTerm
- VS Code
- PyCharm

修改 macOS 權限後，請重新啟動 backend。

---

### 麥克風權限失敗

請使用：

```text
http://localhost:6173
```

或 HTTPS。

瀏覽器 microphone API 通常不能在任意 insecure origin 上正常使用。

請確認：

1. 瀏覽器允許 microphone permission。
2. 作業系統隱私設定允許麥克風。
3. App 中的 Microphone dropdown 選到正確麥克風。

---

### STT 只回傳標點或空 transcript

Whisper 會用較安全的 decoding 設定 retry 一次。

無效 transcript 會從 UI 隱藏，並且不會被用於評分。

建議：

- 到安靜環境重新錄音。
- 檢查 live waveform 是否有明顯變化。
- 確認麥克風輸入正確。

---

### Browser 指到錯誤 backend URL

可以在啟動 frontend 前設定：

```bash
VITE_API_BASE=http://localhost:<BACKEND_PORT>
```

並確認 backend terminal 顯示：

```text
Backend running at http://localhost:<BACKEND_PORT>
```

---

## 21. 限制

此工具有以下限制：

1. 這是本機練習工具，不是臨床語音評估系統。
2. STT 分數主要衡量語音辨識引擎是否聽懂文字，不等於完整發音診斷。
3. Apple STT 是唯一 native comparison provider，而且只支援 macOS。
4. Colab Whisper 是遠端且實驗性功能；啟用時音訊會離開你的電腦。
5. Docker 目前不是支援的 release target。
6. Apple Speech 與 MPS 不應預期能在 Docker 中正常運作。
7. 瀏覽器與麥克風行為會依作業系統與瀏覽器不同而變化。
8. 發布 release 前，建議使用 `MANUAL_QA.md` 做人工測試。

---

## 22. 測試

Python tests：

```bash
python -m unittest tests.test_stt_providers
```

Backend storage tests：

```bash
npm --prefix backend test
```

Frontend build：

```bash
npm --prefix frontend run build
```

所有標準檢查：

```bash
./scripts/run_all_tests.sh
```

Windows：

```powershell
.\scripts\run_all_tests.ps1
```

選用 native STT smoke tests：

```bash
RUN_APPLE_STT_SMOKE=1 python -m unittest tests.test_stt_providers.STTProviderTests.test_apple_provider_smoke
```
