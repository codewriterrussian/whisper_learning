<!-- Language Switcher -->
<p align="right">
  <a href="./README_BEGINNER.md">English</a> |
  <a href="./README_BEGINNER_zh-TW.md">繁體中文</a>
</p>

# Whisper Speaking Practice: Start Here

This guide is for people who do not code.

You do not need to understand Python, Node.js, npm, FFmpeg, Whisper, CUDA, or MPS to use the app.

## What This App Does

Whisper Speaking Practice helps you practice pronunciation.

You choose a language sentence, listen to a model voice, record yourself, and get feedback:

- score
- transcript
- word comparison
- pronunciation tip
- fluency and timing feedback
- practice history

By default, your recording is checked on your own computer.

## The Short Version

### macOS

1. Open this app folder.
2. Double-click `setup_mac.command`.
3. Wait until it says setup finished.
4. Double-click `run_mac.command`.
5. Your browser should open the app.

### Windows

1. Open this app folder.
2. Right-click `setup_windows.ps1`.
3. Click **Run with PowerShell**.
4. Wait until it says setup finished.
5. Double-click `run_windows.bat`.
6. Your browser should open the app.

## What Success Looks Like

When the app starts correctly:

- a browser window opens
- the page title says **Whisper Speaking Practice**
- you see **Practice language**
- you see **Target sentence**
- you see **Start Recording**
- you see **Check Selected Recording**

The app may also open one or two command windows. That is normal. Leave them open while using the app.

To stop the app, close those command windows.

## Before You Start

The app needs a few helper tools on your computer.

The setup script checks these for you:

- Python: runs the speech tools
- Node.js: runs the web app
- FFmpeg: prepares your audio recording
- Whisper: checks your speech

If one is missing, the setup script or System Check will tell you what to install.

## macOS Whisper Device

On Apple Silicon macOS, this app defaults OpenAI Whisper to MPS for faster local checking.

On Intel macOS, Windows, and Linux, this app defaults Whisper to CPU for compatibility. CPU remains available in Advanced Mode on Apple Silicon too.

## macOS Step By Step

1. Put the app folder somewhere simple, such as **Documents**.
2. Open the app folder in Finder.
3. Double-click `setup_mac.command`.
4. If macOS blocks it, right-click `setup_mac.command`, choose **Open**, then choose **Open** again.
5. Wait. Setup may take several minutes.
6. When setup finishes, double-click `run_mac.command`.
7. Your browser should open automatically.

If setup says a tool is missing:

- Python: install it from <https://www.python.org/downloads/>
- Node.js: install the LTS version from <https://nodejs.org/>
- FFmpeg: install Homebrew from <https://brew.sh/>, then install FFmpeg

For FFmpeg on macOS, Homebrew uses this command:

```bash
brew install ffmpeg
```

If you do not know how to use that command, ask a technical helper to install FFmpeg once. After that, you can use the app normally.

## Windows Step By Step

1. Put the app folder somewhere simple, such as **Documents**.
2. Open the app folder in File Explorer.
3. Right-click `setup_windows.ps1`.
4. Click **Run with PowerShell**.
5. Wait. Setup may take several minutes.
6. When setup finishes, double-click `run_windows.bat`.
7. Your browser should open automatically.

If PowerShell blocks the setup script:

1. Open the Start menu.
2. Search for **PowerShell**.
3. Open PowerShell.
4. Paste this line:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

5. Press Enter.
6. Type `Y` if Windows asks for confirmation.
7. Try `setup_windows.ps1` again.

If setup says a tool is missing:

- Python: install it from <https://www.python.org/downloads/>
- Node.js: install the LTS version from <https://nodejs.org/>
- FFmpeg: install it with this Windows command:

```powershell
winget install Gyan.FFmpeg
```

Important for Python on Windows: during installation, check **Add Python to PATH** if you see that option.

## First Launch May Be Slow

The first time you check a recording, the app may download a speech recognition model.

This can take a while.

This is normal.

The default local Whisper model is `large-v3-turbo`. Apple Silicon Macs use MPS by default, while Intel Macs, Windows, and Linux use CPU by default.

First launch or the first recording may be slower because Whisper is downloading, loading, or warming up. Later checks should be faster.

On macOS, the app can use Whisper + Apple STT comparison when supported. Apple STT may return first, while the Whisper score can arrive later.

Apple STT needs macOS Speech Recognition permission. Open **System Settings -> Privacy & Security -> Speech Recognition**, then enable the app used to launch the backend, such as Terminal, iTerm, PyCharm, VS Code, or the command launcher. Restart `run_mac.command` after changing this permission.

If Apple STT fails or is blocked, Whisper still works and scores your pronunciation. In Whisper + Apple STT mode, Apple STT is optional diagnostic comparison while Whisper remains the main scoring provider.

## Microphone Permission

When the browser asks for microphone access, click **Allow**.

If you click **Block**, the app cannot record your voice.

If recording does not work:

- reload the page
- check the browser microphone permission
- choose a microphone in the **Microphone** dropdown

## How To Use The App

1. Choose a practice language.
2. Read the target sentence.
3. Click **Listen / Generate** to hear the model voice.
4. Click **Start Recording**.
5. Speak the sentence.
6. Stop recording.
7. Choose the attempt you want to check.
8. Click **Check Selected Recording**.
9. Read the score and teacher feedback.
10. Practice again.

## Simple Mode And Advanced Mode

Stay in **Simple Mode** if you are new.

Simple Mode shows only:

- Accuracy mode: Recommended or Fast
- Native comparison: Off or On when available
- System Check

Use **Advanced Mode** only if you are comfortable with technical settings.

Advanced Mode shows model names and device options. Apple Silicon Mac should show MPS by default; Intel Mac, Windows, and Linux should show CPU by default. Most beginners do not need to change those.

## System Check

In the app, click:

**Settings -> System Check**

System Check tells you whether the app has what it needs.

It shows simple statuses:

- OK
- Missing

If something is missing, it gives a short fix message.

Raw technical details are hidden under **Advanced details**.

## Common Problems

| What you see | What it means | What to do |
| --- | --- | --- |
| Python is missing | The speech tools cannot run yet. | Install Python 3.10 or newer. |
| Node.js/npm is missing | The web app cannot start yet. | Install Node.js LTS. |
| FFmpeg is missing | The app cannot prepare audio yet. | Install FFmpeg. |
| Whisper is missing | The speech checker is not installed yet. | Run the setup script again. |
| Browser asks for microphone access | The app needs permission to record. | Click Allow. |
| First check is very slow | A speech model is loading or downloading. | Wait. Later checks are usually faster. |
| Apple STT is skipped | Apple Speech is optional on macOS. | You can ignore this and use Whisper. |
| Apple STT is blocked by macOS | Speech Recognition permission is missing for the app that launched the backend. | Enable Speech Recognition for Terminal, iTerm, PyCharm, VS Code, or the command launcher, then restart `run_mac.command`. |
| Native comparison is skipped on Windows | Windows uses Whisper by default. | This is expected. |
| App opens command windows | The app is running locally. | Keep them open while using the app. |
| Browser does not open | The app may still be starting. | Open `http://localhost:6173` manually. |

## Privacy

By default, recordings stay on your computer.

Do not use the optional Colab Whisper mode for private recordings, because it sends audio to a remote Google Colab runtime.

## For Technical Users

The main [README.md](README.md) has developer setup, command-line usage, environment variables, tests, and advanced STT provider information.
