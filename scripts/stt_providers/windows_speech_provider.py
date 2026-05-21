from __future__ import annotations

import platform
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

from .base import STTProvider

ROOT = Path(__file__).resolve().parents[2]
HELPER_SCRIPT = ROOT / "scripts" / "windows_speech_helper" / "windows_speech_transcribe.ps1"

WINDOWS_LOCALES = {
    "en": "en-US",
    "de": "de-DE",
    "nl": "nl-NL",
    "pl": "pl-PL",
    "ru": "ru-RU",
    "ja": "ja-JP",
    "vi": "vi-VN",
    "zh": "zh-CN",
}


class WindowsSpeechProvider(STTProvider):
    """Experimental Windows-only STT provider using native Windows Speech APIs."""

    def __init__(self, language: Optional[str] = None) -> None:
        self.language = language or "en"
        self.locale = WINDOWS_LOCALES.get(self.language, "en-US")

    def _ensure_windows(self) -> None:
        if platform.system() != "Windows":
            raise RuntimeError("Windows Speech STT is Windows-only and experimental.")

    def _convert_to_wav(self, source_path: Path, output_path: Path) -> None:
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("ffmpeg is required for Windows Speech audio conversion.")

        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                str(source_path),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(output_path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

    def _powershell_command(self) -> str:
        for candidate in ("powershell", "pwsh"):
            command = shutil.which(candidate)
            if command:
                return command
        raise RuntimeError("PowerShell is required for Windows Speech STT.")

    def transcribe(self, audio_path: str) -> str:
        self._ensure_windows()
        source_path = Path(audio_path)
        if not source_path.exists():
            raise FileNotFoundError(f"Audio file not found: {source_path}")
        if not HELPER_SCRIPT.exists():
            raise FileNotFoundError(f"Windows Speech helper not found: {HELPER_SCRIPT}")

        with tempfile.TemporaryDirectory(prefix="windows_speech_stt_") as temp_dir:
            wav_path = Path(temp_dir) / "input.wav"
            self._convert_to_wav(source_path, wav_path)
            completed = subprocess.run(
                [
                    self._powershell_command(),
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(HELPER_SCRIPT),
                    "-AudioPath",
                    str(wav_path),
                    "-Locale",
                    self.locale,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=45,
            )

        return completed.stdout.strip()

    def transcribe_result(self, audio_path: str) -> dict[str, Any]:
        started = time.perf_counter()
        try:
            transcript = self.transcribe(audio_path)
            return {
                "provider": "windows_speech",
                "status": "ok",
                "transcript": transcript,
                "score": None,
                "error": "",
                "timeSec": round(time.perf_counter() - started, 3),
            }
        except Exception as error:
            return {
                "provider": "windows_speech",
                "status": "failed",
                "transcript": "",
                "score": None,
                "error": str(error),
                "timeSec": round(time.perf_counter() - started, 3),
            }
