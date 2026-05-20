from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.stt_model import get_provider, transcribe_audio, transcribe_both  # noqa: E402
from scripts.stt_providers import WhisperProvider  # noqa: E402


def warmup_if_requested() -> None:
    if os.environ.get("WHISPER_WARMUP") != "1":
        return

    model_name = os.environ.get("WHISPER_MODEL", "large")
    device = os.environ.get("WHISPER_DEVICE", "auto")
    provider = WhisperProvider(model_name=model_name, device=device, fast_mode=True)
    provider.get_model()


def handle_request(payload: dict[str, Any]) -> Any:
    provider = payload.get("sttProvider") or "whisper"
    audio_path = payload["audioPath"]
    language = payload.get("language")
    model_name = payload.get("modelName") or "large"
    device = payload.get("device") or "auto"
    fast_mode = bool(payload.get("fastMode", True))

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

    return transcribe_audio(
        audio_path,
        language=language,
        model_name=model_name,
        device=device,
        stt_provider=provider,
        fast_mode=fast_mode,
        preprocess=False,
    )


def main() -> None:
    warmup_if_requested()

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
