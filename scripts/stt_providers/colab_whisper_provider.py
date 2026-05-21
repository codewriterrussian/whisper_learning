from __future__ import annotations

import json
import mimetypes
import os
import socket
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from .base import STTProvider


class ColabWhisperProvider(STTProvider):
    """Experimental remote Whisper provider backed by a user-run Google Colab worker."""

    def __init__(
        self,
        language: Optional[str] = None,
        model_name: Optional[str] = None,
        fast_mode: bool = True,
        endpoint_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ) -> None:
        self.language = language
        self.model_name = model_name or os.environ.get("WHISPER_MODEL", "large-v3-turbo")
        self.fast_mode = fast_mode
        self.endpoint_url = (endpoint_url or os.environ.get("COLAB_STT_URL") or "").strip()
        self.timeout_seconds = float(timeout_seconds or os.environ.get("COLAB_STT_TIMEOUT") or 120)

    def _result(
        self,
        status: str,
        transcript: str = "",
        error: str = "",
        started: Optional[float] = None,
        model: Optional[str] = None,
        device: Optional[str] = None,
        score: Any = None,
    ) -> dict[str, Any]:
        return {
            "provider": "colab_whisper",
            "status": status,
            "transcript": transcript,
            "score": score,
            "error": error,
            "timeSec": round(time.perf_counter() - started, 3) if started else 0,
            "model": model or self.model_name,
            "device": device or "remote",
        }

    def _build_multipart_body(self, audio_path: Path) -> tuple[bytes, str]:
        boundary = f"----whisper-learning-{uuid4().hex}"
        content_type = mimetypes.guess_type(str(audio_path))[0] or "application/octet-stream"
        fields = {
            "language": self.language or "",
            "model": self.model_name,
            "fastMode": "true" if self.fast_mode else "false",
        }
        body = bytearray()

        def add_line(value: str = "") -> None:
            body.extend(value.encode("utf-8"))
            body.extend(b"\r\n")

        for name, value in fields.items():
            add_line(f"--{boundary}")
            add_line(f'Content-Disposition: form-data; name="{name}"')
            add_line()
            add_line(value)

        add_line(f"--{boundary}")
        add_line(f'Content-Disposition: form-data; name="audio"; filename="{audio_path.name}"')
        add_line(f"Content-Type: {content_type}")
        add_line()
        body.extend(audio_path.read_bytes())
        body.extend(b"\r\n")
        add_line(f"--{boundary}--")

        return bytes(body), f"multipart/form-data; boundary={boundary}"

    def transcribe_result(self, audio_path: str) -> dict[str, Any]:
        started = time.perf_counter()
        if not self.endpoint_url:
            return self._result("unavailable", error="Colab Whisper is not configured.", started=started)

        path = Path(audio_path)
        if not path.exists():
            return self._result("failed", error=f"Audio file not found: {path}", started=started)

        try:
            body, content_type = self._build_multipart_body(path)
            request = urllib.request.Request(
                self.endpoint_url,
                data=body,
                headers={"Content-Type": content_type, "Accept": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw_response = response.read().decode("utf-8")
            payload = json.loads(raw_response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace") if error.fp else str(error)
            return self._result("failed", error=f"Colab Whisper HTTP {error.code}: {detail}", started=started)
        except urllib.error.URLError as error:
            return self._result("unavailable", error=f"Colab Whisper unavailable: {error.reason}", started=started)
        except (TimeoutError, socket.timeout):
            return self._result("unavailable", error="Colab Whisper request timed out.", started=started)
        except json.JSONDecodeError:
            return self._result("failed", error="Colab Whisper returned invalid JSON.", started=started)
        except Exception as error:
            return self._result("failed", error=str(error), started=started)

        status = str(payload.get("status") or "ok").lower()
        if status not in {"ok", "failed", "invalid", "skipped", "unavailable"}:
            status = "failed"
        return self._result(
            status,
            transcript=str(payload.get("transcript") or "").strip(),
            error=str(payload.get("error") or ""),
            started=started,
            model=str(payload.get("model") or self.model_name),
            device=str(payload.get("device") or "remote"),
            score=payload.get("score"),
        )

    def transcribe(self, audio_path: str) -> str:
        result = self.transcribe_result(audio_path)
        if result["status"] == "ok":
            return result["transcript"]
        raise RuntimeError(result["error"] or "Colab Whisper transcription failed.")
