from __future__ import annotations

import platform
import signal
import shutil
import subprocess
import tempfile
import os
from pathlib import Path

from .base import STTProvider

APPLE_LOCALES = {
    "en": "en-US",
    "de": "de-DE",
    "nl": "nl-NL",
    "pl": "pl-PL",
    "ru": "ru-RU",
    "ja": "ja-JP",
    "vi": "vi-VN",
    "zh": "zh-CN",
}

SWIFT_HELPER = r'''
import Foundation
import Speech

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: apple_speech_transcribe <audio.wav> <locale>\n", stderr)
    exit(2)
}

let audioURL = URL(fileURLWithPath: args[1])
let localeIdentifier = args[2]
let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
guard let recognizer = recognizer, recognizer.isAvailable else {
    fputs("Apple Speech recognizer is unavailable for locale \(localeIdentifier). Check macOS Speech Recognition permissions or try another language.\n", stderr)
    exit(3)
}

let semaphore = DispatchSemaphore(value: 0)
var isDone = false
var transcript = ""
var failure: String?
var task: SFSpeechRecognitionTask?

SFSpeechRecognizer.requestAuthorization { status in
    guard status == .authorized else {
        failure = "Apple Speech permission was not authorized. Enable Speech Recognition permission in macOS Settings."
        isDone = true
        return
    }

    let request = SFSpeechURLRecognitionRequest(url: audioURL)
    request.shouldReportPartialResults = false

    task = recognizer.recognitionTask(with: request) { result, error in
        if let result = result {
            transcript = result.bestTranscription.formattedString
        }
        if let error = error {
            failure = error.localizedDescription
            isDone = true
            return
        }
        if result?.isFinal == true {
            isDone = true
        }
    }
}

let deadline = Date().addingTimeInterval(45)
while !isDone && Date() < deadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.1))
}

task?.cancel()

if !isDone {
    fputs("Apple Speech transcription timed out.\n", stderr)
    exit(4)
}

if let failure = failure {
    fputs("\(failure)\n", stderr)
    exit(5)
}

print(transcript)
'''

INFO_PLIST = r'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>local.whisper-learning.apple-speech-helper</string>
  <key>CFBundleName</key>
  <string>Whisper Learning Apple Speech Helper</string>
  <key>NSSpeechRecognitionUsageDescription</key>
  <string>Transcribe recorded speaking-practice audio for comparison with Whisper.</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Access recorded speaking-practice audio for speech recognition.</string>
</dict>
</plist>
'''

ROOT = Path(__file__).resolve().parents[2]
HELPER_DIR = ROOT / ".apple_speech_helper"
HELPER_APP = HELPER_DIR / "AppleSpeechTranscribe.app"
HELPER_CONTENTS = HELPER_APP / "Contents"
HELPER_MACOS = HELPER_CONTENTS / "MacOS"
HELPER_RESOURCES = HELPER_CONTENTS / "Resources"
HELPER_SOURCE = HELPER_DIR / "apple_speech_transcribe.swift"
HELPER_PLIST = HELPER_CONTENTS / "Info.plist"
HELPER_BINARY = HELPER_MACOS / "apple_speech_transcribe"


def format_subprocess_error(error: subprocess.CalledProcessError) -> str:
    if error.returncode and error.returncode < 0:
        try:
            signal_name = signal.Signals(-error.returncode).name
        except ValueError:
            signal_name = f"signal {-error.returncode}"

        if signal_name == "SIGABRT":
            return (
                "Apple Speech helper was aborted by macOS. This usually means Speech Recognition permission "
                "is missing for the backend-launching app, or macOS rejected the helper identity. Enable Speech "
                "Recognition for Terminal, iTerm, PyCharm, or VS Code in System Settings, then restart the backend."
            )

        return f"Apple Speech helper stopped with {signal_name}."

    stderr = (error.stderr or "").strip()
    stdout = (error.stdout or "").strip()
    detail = stderr or stdout or str(error)
    lines = [line for line in detail.splitlines() if line.strip() and not line.startswith("nwi_state:")]
    if lines:
        detail = "\n".join(lines)
    return detail


def build_helper_app(helper_env: dict[str, str]) -> Path:
    HELPER_MACOS.mkdir(parents=True, exist_ok=True)
    HELPER_RESOURCES.mkdir(parents=True, exist_ok=True)
    HELPER_SOURCE.write_text(SWIFT_HELPER, encoding="utf-8")
    HELPER_PLIST.write_text(INFO_PLIST, encoding="utf-8")

    subprocess.run(
        [
            "swiftc",
            str(HELPER_SOURCE),
            "-o",
            str(HELPER_BINARY),
            "-Xlinker",
            "-sectcreate",
            "-Xlinker",
            "__TEXT",
            "-Xlinker",
            "__info_plist",
            "-Xlinker",
            str(HELPER_PLIST),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=45,
        env=helper_env,
    )

    if shutil.which("codesign"):
        subprocess.run(
            ["codesign", "--force", "--sign", "-", str(HELPER_APP)],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=15,
        )

    return HELPER_BINARY


class AppleSpeechProvider(STTProvider):
    """Experimental macOS Apple Speech provider."""

    def __init__(self, language: str | None = None) -> None:
        self.language = language

    @property
    def locale(self) -> str:
        return APPLE_LOCALES.get(self.language or "", "en-US")

    def transcribe(self, audio_path: str) -> str:
        if platform.system() != "Darwin":
            raise RuntimeError("Apple Speech STT is macOS-only. Use --stt-provider whisper on this system.")

        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        if not shutil.which("swiftc"):
            raise RuntimeError("Apple Speech STT requires the macOS Swift compiler (`swiftc`) to be available.")

        if not shutil.which("ffmpeg"):
            raise RuntimeError("Apple Speech STT requires ffmpeg to convert audio to wav.")

        with tempfile.TemporaryDirectory(prefix="apple_speech_stt_") as temp_dir:
            temp_path = Path(temp_dir)
            wav_path = temp_path / "input.wav"
            helper_env = {
                **os.environ,
                "CLANG_MODULE_CACHE_PATH": str(HELPER_DIR / "clang_module_cache"),
                "TMPDIR": str(temp_path),
            }

            try:
                binary_path = build_helper_app(helper_env)

                subprocess.run(
                    ["ffmpeg", "-y", "-i", str(path), "-ar", "16000", "-ac", "1", str(wav_path)],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                    text=True,
                )

                result = subprocess.run(
                    [str(binary_path), str(wav_path), self.locale],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=40,
                    env=helper_env,
                )
            except subprocess.TimeoutExpired as error:
                raise RuntimeError(
                    "Apple Speech timed out. Enable Speech Recognition permission for Terminal or your IDE in "
                    "macOS System Settings, then try again. Apple STT is experimental; Whisper scoring still works."
                ) from error
            except subprocess.CalledProcessError as error:
                detail = format_subprocess_error(error)
                if "timed out" in detail.lower():
                    detail = (
                        "Apple Speech transcription timed out. Enable Speech Recognition permission for Terminal "
                        "or your IDE in macOS System Settings, then try again."
                    )
                raise RuntimeError(detail) from error

        return result.stdout.strip()
