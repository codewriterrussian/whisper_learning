from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.stt_model import get_native_provider_name, get_provider, transcribe_audio, transcribe_both  # noqa: E402
from scripts.stt_providers.apple_speech_provider import prebuild_helper as prebuild_apple_speech_helper  # noqa: E402
from scripts.stt_providers import WhisperProvider  # noqa: E402
from scripts.stt_providers.whisper_provider import get_recommended_whisper_device, normalize_whisper_backend  # noqa: E402

_WARMED_MODEL_KEYS: set[tuple[str, str, str]] = set()


def provider_needs_whisper(provider: str) -> bool:
    return provider in {"whisper", "both"}


def get_default_model_name() -> str:
    return os.environ.get("WHISPER_MODEL") or "large-v3-turbo"


def get_default_device() -> str:
    return os.environ.get("WHISPER_DEVICE") or get_recommended_whisper_device()


def get_default_backend() -> str:
    return normalize_whisper_backend(os.environ.get("WHISPER_BACKEND"))


def get_warmup_device_label(backend: str, device: str) -> str:
    if backend == "mlx":
        return "mlx/default"
    return device


def warmup_if_requested(provider: str, model_name: str, device: str, reason: str = "request", force: bool = False) -> str:
    if not force and os.environ.get("WHISPER_WARMUP") != "1":
        return "disabled"

    if not provider_needs_whisper(provider):
        print("[INFO] Whisper warmup target: none", file=sys.stderr)
        print(f"[INFO] Skipping Whisper warmup because provider={provider}", file=sys.stderr)
        return "skipped"

    backend = get_default_backend()
    device_label = get_warmup_device_label(backend, device)
    cache_key = (backend, model_name, device_label)
    if cache_key in _WARMED_MODEL_KEYS:
        print(f"[INFO] Whisper warmup cache hit: {backend} model={model_name} device={device_label} reason={reason}", file=sys.stderr)
        return "cache_hit"

    print(f"[INFO] Whisper warmup target: {backend} model={model_name} device={device_label} reason={reason}", file=sys.stderr)
    warmup_provider = WhisperProvider(model_name=model_name, device=device, backend=backend, fast_mode=True)
    warmup_provider.get_model()
    _WARMED_MODEL_KEYS.add(cache_key)
    return "loaded"


def prebuild_apple_helper_if_available() -> str:
    if get_native_provider_name() != "apple":
        return "skipped"
    try:
        prebuild_apple_speech_helper()
        return "ready"
    except Exception as error:
        print(f"[WARN] Apple STT helper prebuild failed: {error}", file=sys.stderr)
        return "failed"


def handle_request(payload: dict[str, Any]) -> Any:
    if payload.get("action") == "warmup":
        model_name = payload.get("modelName") or get_default_model_name()
        device = payload.get("device") or get_default_device()
        backend = get_default_backend()
        reason = payload.get("reason") or "explicit warmup"
        status = warmup_if_requested("whisper", model_name, device, reason=reason, force=True)
        return {
            "status": status,
            "backend": backend,
            "modelName": model_name,
            "device": get_warmup_device_label(backend, device),
        }

    if payload.get("action") == "prebuild_apple_helper":
        return {"status": prebuild_apple_helper_if_available()}

    provider = payload.get("sttProvider") or "whisper"
    comparison_mode = payload.get("comparisonMode") or provider
    audio_path = payload["audioPath"]
    language = payload.get("language")
    model_name = payload.get("modelName") or get_default_model_name()
    device = payload.get("device") or get_default_device()
    fast_mode = bool(payload.get("fastMode", True))

    print(f"[INFO] Selected comparison mode: {comparison_mode}", file=sys.stderr)
    print(f"[INFO] Selected Whisper backend: {get_default_backend() if provider_needs_whisper(provider) else 'none'}", file=sys.stderr)
    warmup_if_requested(provider, model_name, device)

    if provider == "both":
        return transcribe_both(
            audio_path,
            language=language,
            model_name=model_name,
            device=device,
            fast_mode=fast_mode,
            preprocess=False,
        )

    if provider == "whisper":
        whisper_provider = get_provider(
            "whisper",
            language=language,
            model_name=model_name,
            device=device,
            fast_mode=fast_mode,
        )
        if isinstance(whisper_provider, WhisperProvider):
            return whisper_provider.transcribe_with_retry(str(audio_path))

    if provider == "colab_whisper":
        colab_provider = get_provider(
            "colab_whisper",
            language=language,
            model_name=model_name,
            fast_mode=fast_mode,
        )
        if hasattr(colab_provider, "transcribe_result"):
            return colab_provider.transcribe_result(str(audio_path))  # type: ignore[attr-defined]

    try:
        return {
            "status": "ok",
            "transcript": transcribe_audio(
                audio_path,
                language=language,
                model_name=model_name,
                device=device,
                stt_provider=provider,
                fast_mode=fast_mode,
                preprocess=False,
            ),
            "error": "",
        }
    except Exception as error:
        if provider in {"apple", "colab_whisper"}:
            return {"status": "failed", "transcript": "", "error": str(error)}
        raise


def main() -> None:
    prebuild_apple_helper_if_available()
    warmup_if_requested("whisper", get_default_model_name(), get_default_device(), reason="worker startup")

    for line in sys.stdin:
        if not line.strip():
            continue

        request_id = None
        try:
            payload = json.loads(line)
            request_id = payload.get("id")
            result = handle_request(payload)
            response = {"id": request_id, "ok": True, "result": result}
        except Exception as error:
            response = {"id": request_id, "ok": False, "error": str(error)}

        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
