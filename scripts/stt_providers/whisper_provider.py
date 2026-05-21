from __future__ import annotations

import os
import platform
import sys
import time
from pathlib import Path
from typing import Any, Optional

import torch

from scripts.compare import get_transcript_validation_debug, validate_transcript

from .base import STTProvider

_MODEL_CACHE = {}


class WhisperProvider(STTProvider):
    def __init__(
        self,
        language: Optional[str] = None,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        fast_mode: bool = True,
    ) -> None:
        self.language = language
        self.model_name = model_name or os.environ.get("WHISPER_MODEL", "large")
        self.requested_device = device or "auto"
        self.fast_mode = fast_mode
        self.retry_device_policy = os.environ.get("WHISPER_RETRY_DEVICE", "same").lower()

    def resolve_device(self, force_device: Optional[str] = None) -> str:
        if force_device:
            requested_force = force_device.lower()
            if requested_force == "mps" and platform.system() == "Darwin" and torch.backends.mps.is_available():
                return "mps"
            if requested_force == "cuda" and torch.cuda.is_available():
                return "cuda"
            if requested_force not in {"mps", "cuda"}:
                return requested_force
            print(f"[STT] {requested_force} requested but unavailable on this platform; falling back to CPU", file=sys.stderr)
            return "cpu"

        requested_device = self.requested_device.lower()

        if requested_device == "mps":
            if platform.system() == "Darwin" and torch.backends.mps.is_available():
                return "mps"
            print("[STT] MPS requested but unavailable on this platform; falling back to CPU", file=sys.stderr)
            return "cpu"

        if requested_device == "cuda":
            if torch.cuda.is_available():
                return "cuda"
            print("[STT] CUDA requested but unavailable; falling back to CPU", file=sys.stderr)
            return "cpu"

        if requested_device == "auto":
            if platform.system() == "Darwin" and torch.backends.mps.is_available():
                return "mps"
            if torch.cuda.is_available():
                return "cuda"
            return "cpu"

        return "cpu"

    def get_model(self, force_device: Optional[str] = None):
        selected_device = self.resolve_device(force_device=force_device)
        cache_key = (self.model_name, selected_device)

        if cache_key not in _MODEL_CACHE:
            import whisper

            print(f"[STT] Loading Whisper model: {self.model_name} on {selected_device}", file=sys.stderr)
            _MODEL_CACHE[cache_key] = whisper.load_model(self.model_name, device=selected_device)
            print("[STT] Whisper model loaded", file=sys.stderr)

        return _MODEL_CACHE[cache_key]

    def get_transcribe_options(self, safe_retry: bool = False, force_device: Optional[str] = None) -> dict[str, Any]:
        selected_device = self.resolve_device(force_device=force_device)
        options: dict[str, Any] = {"fp16": selected_device != "cpu"}
        if self.language:
            options["language"] = self.language

        if safe_retry:
            options.update(
                {
                    "beam_size": 5,
                    "best_of": 5,
                    "temperature": 0,
                    "condition_on_previous_text": False,
                    "word_timestamps": False,
                },
            )
            return options

        if self.fast_mode:
            options.update(
                {
                    "beam_size": 1,
                    "best_of": 1,
                    "temperature": 0,
                    "condition_on_previous_text": False,
                    "word_timestamps": False,
                },
            )

        return options

    def transcribe_once(self, audio_path: str, safe_retry: bool = False, force_device: Optional[str] = None) -> str:
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        options = self.get_transcribe_options(safe_retry=safe_retry, force_device=force_device)
        result = self.get_model(force_device=force_device).transcribe(str(path), **options)
        return result.get("text", "").strip()

    def transcribe(self, audio_path: str) -> str:
        return self.transcribe_once(audio_path)

    def transcribe_with_retry(self, audio_path: str) -> dict[str, Any]:
        initial_device = self.resolve_device()
        print(
            f"[STT] Whisper request language={self.language or 'auto'} model={self.model_name} "
            f"device={initial_device} fast_mode={self.fast_mode}",
            file=sys.stderr,
        )
        started = time.perf_counter()
        transcript = self.transcribe_once(audio_path)
        first_ms = round((time.perf_counter() - started) * 1000)
        print(f"[timing] Whisper first pass: {first_ms}ms", file=sys.stderr)
        validation = validate_transcript(transcript)
        print(get_transcript_validation_debug("Whisper", transcript, validation.reason), file=sys.stderr)
        if validation.status == "ok":
            return {"status": "ok", "transcript": transcript, "error": "", "recovered": False, "firstPassMs": first_ms, "retryMs": 0}

        print("[STT] Whisper first attempt was invalid, retrying with safer decoding settings.", file=sys.stderr)
        retry_device = "cpu" if self.retry_device_policy == "cpu" and initial_device == "mps" else initial_device
        if retry_device != initial_device:
            print("[STT] Whisper retry switching from MPS to CPU for stability.", file=sys.stderr)
        else:
            print(f"[STT] Whisper retry using {retry_device}. Set WHISPER_RETRY_DEVICE=cpu to force CPU fallback.", file=sys.stderr)
        retry_started = time.perf_counter()
        retry_transcript = self.transcribe_once(audio_path, safe_retry=True, force_device=retry_device)
        retry_ms = round((time.perf_counter() - retry_started) * 1000)
        print(f"[timing] Whisper retry pass: {retry_ms}ms", file=sys.stderr)
        retry_validation = validate_transcript(retry_transcript)
        print(get_transcript_validation_debug("Whisper retry", retry_transcript, retry_validation.reason), file=sys.stderr)
        if retry_validation.status == "ok":
            return {
                "status": "ok_retry",
                "transcript": retry_transcript,
                "error": "",
                "recovered": True,
                "firstPassMs": first_ms,
                "retryMs": retry_ms,
                "retryDevice": retry_device,
            }

        return {
            "status": "invalid",
            "transcript": "",
            "error": retry_validation.reason or validation.reason,
            "recovered": False,
            "firstPassMs": first_ms,
            "retryMs": retry_ms,
            "retryDevice": retry_device,
        }
