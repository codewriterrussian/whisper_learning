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
ALLOWED_WHISPER_BACKENDS = {"openai", "mlx"}


def normalize_whisper_backend(backend: Optional[str] = None) -> str:
    requested = (backend or os.environ.get("WHISPER_BACKEND") or "openai").strip().lower().replace("_", "-")
    if requested in ALLOWED_WHISPER_BACKENDS:
        return requested
    if requested == "faster-whisper":
        print(
            "[WARN] Faster Whisper has been removed from this repo. Falling back to OpenAI Whisper.",
            file=sys.stderr,
        )
    elif requested:
        print(f"[WARN] Unsupported Whisper backend '{requested}'. Falling back to OpenAI Whisper.", file=sys.stderr)
    return "openai"


def get_mlx_model_name(model_name: str) -> str:
    explicit_model = os.environ.get("MLX_WHISPER_MODEL")
    if explicit_model:
        return explicit_model

    model_map = {
        "tiny": "mlx-community/whisper-tiny",
        "base": "mlx-community/whisper-base",
        "small": "mlx-community/whisper-small",
        "medium": "mlx-community/whisper-medium",
        "large": "mlx-community/whisper-large-v3",
        "large-v3": "mlx-community/whisper-large-v3",
        "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
        "turbo": "mlx-community/whisper-large-v3-turbo",
    }
    return model_map.get(model_name, model_name)


def is_apple_silicon() -> bool:
    return sys.platform == "darwin" and platform.machine().lower() in {"arm64", "aarch64"}


def get_recommended_whisper_device() -> str:
    return "mps" if is_apple_silicon() else "cpu"


def keep_multiple_device_models() -> bool:
    return os.environ.get("WHISPER_KEEP_MULTIPLE_DEVICE_MODELS", "0") == "1"


def release_other_openai_models(active_key: tuple[str, str, str]) -> None:
    if keep_multiple_device_models():
        return

    for cache_key in list(_MODEL_CACHE.keys()):
        if cache_key == active_key or cache_key[0] != "openai":
            continue
        _, model_name, device = cache_key
        print(f"[INFO] Releasing cached OpenAI Whisper model: model={model_name} device={device}", file=sys.stderr)
        del _MODEL_CACHE[cache_key]


class WhisperProvider(STTProvider):
    def __init__(
        self,
        language: Optional[str] = None,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        backend: Optional[str] = None,
        fast_mode: bool = True,
    ) -> None:
        self.language = language
        self.model_name = model_name or os.environ.get("WHISPER_MODEL", "large-v3-turbo")
        self.requested_device = device or get_recommended_whisper_device()
        self.backend = normalize_whisper_backend(backend)
        self.fast_mode = fast_mode
        self.retry_device_policy = os.environ.get("WHISPER_RETRY_DEVICE", "same").lower()

    def resolve_device(self, force_device: Optional[str] = None) -> str:
        if self.backend == "mlx":
            return "mlx/default"

        if force_device:
            requested_force = force_device.lower()
            if requested_force in {"cpu", "mps", "cuda"}:
                return requested_force
            print(f"[STT] Unknown device {requested_force}; falling back to CPU", file=sys.stderr)
            return "cpu"

        requested_device = self.requested_device.lower()

        if requested_device == "mps":
            return "mps"

        if requested_device == "cuda":
            return "cuda"

        if requested_device == "auto":
            return get_recommended_whisper_device()

        return "cpu"

    def get_model(self, force_device: Optional[str] = None):
        if self.backend == "mlx":
            selected_device = "mlx/default"
        else:
            selected_device = self.resolve_device(force_device=force_device)
        cache_key = (self.backend, self.model_name, selected_device)

        if cache_key in _MODEL_CACHE:
            if self.backend == "openai":
                release_other_openai_models(cache_key)
                print(f"[INFO] Keeping active OpenAI Whisper model: model={self.model_name} device={selected_device}", file=sys.stderr)
                print(f"[INFO] OpenAI Whisper cache hit: model={self.model_name} device={selected_device}", file=sys.stderr)
            return _MODEL_CACHE[cache_key]

        if cache_key not in _MODEL_CACHE:
            if self.backend == "mlx":
                if not is_apple_silicon():
                    raise RuntimeError("MLX Whisper backend is only supported on Apple Silicon Macs.")
                try:
                    import mlx_whisper
                except ImportError as error:
                    raise RuntimeError(
                        "MLX Whisper backend selected but mlx-whisper is not installed. "
                        "Install it on Apple Silicon macOS with: python -m pip install mlx-whisper",
                    ) from error

                mlx_model = get_mlx_model_name(self.model_name)
                print("[INFO] Local Whisper backend: mlx", file=sys.stderr)
                print(
                    f"[INFO] MLX Whisper ignores WHISPER_DEVICE={self.requested_device} "
                    "and uses MLX default Apple Silicon execution.",
                    file=sys.stderr,
                )
                print(f"[STT] MLX Whisper backend ready: model={mlx_model}", file=sys.stderr)
                _MODEL_CACHE[cache_key] = {"module": mlx_whisper, "model": mlx_model}
                return _MODEL_CACHE[cache_key]

            import whisper

            print(f"[INFO] Local Whisper backend: openai", file=sys.stderr)
            print(f"[INFO] OpenAI Whisper cache miss: loading model={self.model_name} device={selected_device}", file=sys.stderr)
            print(f"[STT] Loading OpenAI Whisper model: {self.model_name} on {selected_device}", file=sys.stderr)
            try:
                release_other_openai_models(cache_key)
                _MODEL_CACHE[cache_key] = whisper.load_model(self.model_name, device=selected_device)
            except RuntimeError as error:
                if selected_device == "mps" and self.retry_device_policy == "cpu":
                    print("[WARN] MPS failed; falling back to CPU for this request.", file=sys.stderr)
                    print(f"[WARN] OpenAI Whisper model load failed on MPS: {error}. Retrying on CPU.", file=sys.stderr)
                    cpu_key = ("openai", self.model_name, "cpu")
                    if cpu_key not in _MODEL_CACHE:
                        release_other_openai_models(cpu_key)
                        _MODEL_CACHE[cpu_key] = whisper.load_model(self.model_name, device="cpu")
                    print(f"[INFO] Keeping active OpenAI Whisper model: model={self.model_name} device=cpu", file=sys.stderr)
                    return _MODEL_CACHE[cpu_key]
                raise
            print("[STT] OpenAI Whisper model loaded", file=sys.stderr)
            print(f"[INFO] Keeping active OpenAI Whisper model: model={self.model_name} device={selected_device}", file=sys.stderr)

        return _MODEL_CACHE[cache_key]

    def transcribe_mlx_once(self, audio_path: str) -> str:
        model = self.get_model()
        mlx_whisper = model["module"]
        mlx_model = model["model"]
        options: dict[str, Any] = {}
        if self.language:
            options["language"] = self.language

        print(
            f"[STT] MLX Whisper request language={self.language or 'auto'} model={mlx_model} "
            f"fast_mode={self.fast_mode}",
            file=sys.stderr,
        )
        started = time.perf_counter()
        try:
            result = mlx_whisper.transcribe(str(audio_path), path_or_hf_repo=mlx_model, **options)
        except Exception as error:
            raise RuntimeError(
                f"MLX Whisper transcription failed for model={mlx_model}: {error}. "
                "Switch back to WHISPER_BACKEND=openai to use the stable OpenAI Whisper backend.",
            ) from error
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        print(f"[timing] MLX Whisper transcribe: {elapsed_ms}ms", file=sys.stderr)
        if isinstance(result, dict):
            return str(result.get("text", "")).strip()
        return str(result).strip()

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

        if self.backend == "mlx":
            return self.transcribe_mlx_once(str(path))

        options = self.get_transcribe_options(safe_retry=safe_retry, force_device=force_device)
        result = self.get_model(force_device=force_device).transcribe(str(path), **options)
        return result.get("text", "").strip()

    def transcribe(self, audio_path: str) -> str:
        return self.transcribe_once(audio_path)

    def transcribe_with_retry(self, audio_path: str) -> dict[str, Any]:
        initial_device = self.resolve_device()
        print(
            f"[STT] Whisper request backend={self.backend} language={self.language or 'auto'} model={self.model_name} "
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
        retry_device = "cpu" if self.retry_device_policy == "cpu" and self.requested_device.lower() == "auto" and initial_device == "mps" else initial_device
        if retry_device != initial_device:
            print("[WARN] MPS failed; falling back to CPU for this request.", file=sys.stderr)
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
