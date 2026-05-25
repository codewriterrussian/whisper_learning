from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import json
import os
import platform
import sys
import time
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.stt_providers import AppleSpeechProvider, ColabWhisperProvider, STTProvider, WhisperProvider
from scripts.audio_similarity import preprocess_audio

DEFAULT_STT_PROVIDER = "whisper"
ALLOWED_STT_PROVIDERS = {"whisper", "apple", "colab_whisper", "both"}
DEFAULT_APPLE_COMPARISON_TIMEOUT_SECONDS = 10.0


def log_timing(message: str) -> None:
    print(f"[timing] {message}", file=sys.stderr)


def is_apple_permission_or_helper_abort(message: str) -> bool:
    text = str(message or "").lower()
    return any(
        marker in text
        for marker in (
            "apple speech helper was aborted by macos",
            "speech recognition permission",
            "permission was not authorized",
            "permission is not authorized",
            "not authorized",
            "rejected the helper identity",
        )
    )


def get_platform_key(system_name: Optional[str] = None) -> str:
    system = system_name or platform.system()
    if system == "Darwin":
        return "darwin"
    if system == "Windows":
        return "win32"
    if system == "Linux":
        return "linux"
    return system.lower()


def get_native_provider_name(platform_key: Optional[str] = None) -> Optional[str]:
    current_platform = platform_key or get_platform_key()
    if current_platform == "darwin":
        return "apple"
    return None


def get_native_provider_label(provider_name: Optional[str]) -> str:
    if provider_name == "apple":
        return "Apple"
    if provider_name == "colab_whisper":
        return "Colab Whisper"
    return "Native STT"


def get_available_stt_providers(platform_key: Optional[str] = None) -> list[str]:
    native_provider = get_native_provider_name(platform_key)
    providers = ["whisper"]
    if native_provider:
        providers.append(native_provider)
        providers.append("both")
    providers.append("colab_whisper")
    return providers


def get_provider(
    provider_name: str = DEFAULT_STT_PROVIDER,
    language: Optional[str] = None,
    model_name: Optional[str] = None,
    device: Optional[str] = None,
    fast_mode: bool = True,
    native_timeout_seconds: Optional[float] = None,
) -> STTProvider:
    """Create an STT provider by name."""
    normalized_provider = (provider_name or DEFAULT_STT_PROVIDER).lower()

    if normalized_provider == "whisper":
        return WhisperProvider(language=language, model_name=model_name, device=device, fast_mode=fast_mode)

    if normalized_provider == "apple":
        return AppleSpeechProvider(language=language, timeout_seconds=native_timeout_seconds)

    if normalized_provider == "colab_whisper":
        return ColabWhisperProvider(language=language, model_name=model_name, fast_mode=fast_mode)

    allowed = ", ".join(sorted(ALLOWED_STT_PROVIDERS))
    raise ValueError(f"Unknown STT provider: {provider_name}. Expected one of: {allowed}")


def get_apple_comparison_timeout_seconds() -> float:
    raw_timeout = os.environ.get("APPLE_STT_COMPARISON_TIMEOUT") or str(DEFAULT_APPLE_COMPARISON_TIMEOUT_SECONDS)
    try:
        timeout = float(raw_timeout)
    except ValueError:
        timeout = DEFAULT_APPLE_COMPARISON_TIMEOUT_SECONDS
    return max(1.0, timeout)


def transcribe_audio(
    audio_path: str | Path,
    language: Optional[str] = None,
    model_name: Optional[str] = None,
    device: Optional[str] = None,
    stt_provider: str = DEFAULT_STT_PROVIDER,
    fast_mode: bool = True,
    preprocess: bool = True,
) -> str:
    """Transcribe an audio file and return plain text."""
    prepared_audio_path = preprocess_audio(audio_path) if preprocess else Path(audio_path)
    if stt_provider == "both":
        return transcribe_both(
            prepared_audio_path,
            language=language,
            model_name=model_name,
            device=device,
            fast_mode=fast_mode,
            preprocess=False,
        )["whisper"]["transcript"]

    provider = get_provider(
        provider_name=stt_provider,
        language=language,
        model_name=model_name,
        device=device,
        fast_mode=fast_mode,
    )
    return provider.transcribe(str(prepared_audio_path))


def transcribe_both(
    audio_path: str | Path,
    language: Optional[str] = None,
    model_name: Optional[str] = None,
    device: Optional[str] = None,
    fast_mode: bool = True,
    preprocess: bool = True,
) -> dict[str, Any]:
    """Transcribe with Whisper and the platform-native STT provider when available."""
    prepared_audio_path = preprocess_audio(audio_path) if preprocess else Path(audio_path)
    native_provider = get_native_provider_name()
    native_timing_key = f"{native_provider}Ms" if native_provider else "nativeMs"
    result: dict[str, Any] = {
        "whisper": {"status": "pending", "transcript": "", "error": ""},
        "apple": {"status": "skipped", "transcript": "", "error": ""},
        "native_provider": native_provider or "",
        "_timings": {"whisperMs": 0, "appleMs": 0, native_timing_key: 0},
    }
    provider_block_started = time.perf_counter()

    def run_whisper() -> tuple[dict[str, Any], int]:
        started = time.perf_counter()
        log_timing("Whisper start")
        provider = get_provider(
            "whisper",
            language=language,
            model_name=model_name,
            device=device,
            fast_mode=fast_mode,
        )
        provider_result: dict[str, Any] = {"status": "ok", "transcript": "", "error": ""}
        if isinstance(provider, WhisperProvider):
            provider_result.update(provider.transcribe_with_retry(str(prepared_audio_path)))
        else:
            provider_result["transcript"] = provider.transcribe(str(prepared_audio_path))
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        log_timing(f"Whisper end: {elapsed_ms}ms")
        return provider_result, elapsed_ms

    def run_native() -> tuple[str, dict[str, Any], int]:
        started = time.perf_counter()
        if not native_provider:
            return "", {"status": "skipped", "transcript": "", "error": "No native STT provider on this platform."}, 0

        log_timing(f"{get_native_provider_label(native_provider)} STT start")
        provider_result: dict[str, Any] = {"status": "pending", "transcript": "", "error": ""}
        try:
            provider = get_provider(
                native_provider,
                language=language,
                native_timeout_seconds=get_apple_comparison_timeout_seconds() if native_provider == "apple" else None,
            )
            if hasattr(provider, "transcribe_result"):
                structured_result = provider.transcribe_result(str(prepared_audio_path))  # type: ignore[attr-defined]
                provider_result.update(structured_result)
            else:
                provider_result["transcript"] = provider.transcribe(str(prepared_audio_path))
                provider_result["status"] = "ok"
        except Exception as error:  # Apple Speech is optional and experimental.
            provider_result["status"] = "failed"
            provider_result["error"] = str(error)
            if native_provider == "apple" and is_apple_permission_or_helper_abort(str(error)):
                print(f"[WARN] Apple STT macOS permission/helper abort: {error}", file=sys.stderr)
                print("[WARN] Apple STT failed; continuing with OpenAI Whisper result when available.", file=sys.stderr)
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        log_timing(f"{get_native_provider_label(native_provider)} STT end: {elapsed_ms}ms")
        return native_provider, provider_result, elapsed_ms

    executor = ThreadPoolExecutor(max_workers=2)
    try:
        log_timing("Whisper + native provider block start; submitting concurrent jobs")
        whisper_future = executor.submit(run_whisper)
        native_future = executor.submit(run_native)
        result["whisper"], result["_timings"]["whisperMs"] = whisper_future.result()
        native_wait_timeout = get_apple_comparison_timeout_seconds() if native_provider == "apple" else None
        try:
            native_name, native_result, native_ms = native_future.result(timeout=native_wait_timeout)
        except FutureTimeoutError:
            native_name = native_provider or ""
            native_ms = round((time.perf_counter() - provider_block_started) * 1000)
            native_result = {
                "status": "failed",
                "transcript": "",
                "error": (
                    f"{get_native_provider_label(native_provider)} STT timed out after "
                    f"{get_apple_comparison_timeout_seconds():g}s. Continuing with Whisper result."
                ),
            }
            native_future.cancel()
            log_timing(f"{get_native_provider_label(native_provider)} STT comparison timeout; continuing with Whisper")
        if native_name:
            result[native_name] = native_result
            result["_timings"][native_timing_key] = native_ms
            if native_name == "apple":
                result["_timings"]["appleMs"] = native_ms
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    provider_block_ms = round((time.perf_counter() - provider_block_started) * 1000)
    slowest_provider_ms = max(result["_timings"].get("whisperMs", 0), result["_timings"].get(native_timing_key, 0))
    result["_timings"]["providerBlockMs"] = provider_block_ms
    result["_timings"]["providerOverheadMs"] = provider_block_ms - slowest_provider_ms
    log_timing(
        "Whisper + native provider block end: "
        f"{provider_block_ms}ms slowest_provider={slowest_provider_ms}ms overhead={provider_block_ms - slowest_provider_ms}ms"
    )
    return result


def write_transcript_outputs(output_path: Path, stt_provider: str, transcript_result: str | dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if stt_provider == "both":
        assert isinstance(transcript_result, dict)
        whisper_path = output_path.with_name(f"{output_path.stem}.whisper.txt")
        native_provider = transcript_result.get("native_provider") or get_native_provider_name()
        native_path = output_path.with_name(f"{output_path.stem}.{native_provider}.txt") if native_provider else None
        whisper_path.write_text(f"{transcript_result['whisper']['transcript']}\n", encoding="utf-8")
        if native_provider and native_path:
            native_path.write_text(f"{transcript_result[native_provider]['transcript']}\n", encoding="utf-8")
        output_path.write_text(f"{transcript_result['whisper']['transcript']}\n", encoding="utf-8")
        return

    assert isinstance(transcript_result, str)
    output_path.write_text(f"{transcript_result}\n", encoding="utf-8")
    if stt_provider in {"whisper", "apple", "colab_whisper"}:
        provider_path = output_path.with_name(f"{output_path.stem}.{stt_provider}.txt")
        provider_path.write_text(f"{transcript_result}\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe an audio file with a selectable STT provider.")
    parser.add_argument("audio_path", help="Audio file to transcribe.")
    parser.add_argument("--language", default=None, help="Whisper language hint, for example en, de, ja, zh.")
    parser.add_argument("--model", default=None, help="Whisper model name, for example base, medium, large.")
    parser.add_argument("--device", default=None, help="Whisper device: auto, cpu, mps, or cuda.")
    parser.add_argument("--fast-mode", action=argparse.BooleanOptionalAction, default=True, help="Use fast decoding settings for short practice recordings.")
    parser.add_argument("--preprocess", action=argparse.BooleanOptionalAction, default=True, help="Convert audio to reusable 16 kHz mono wav before STT.")
    parser.add_argument("--stt-provider", choices=sorted(ALLOWED_STT_PROVIDERS), default=DEFAULT_STT_PROVIDER)
    parser.add_argument("--output", default=None, help="Optional transcript output path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.stt_provider == "both":
        transcript_result: str | dict[str, Any] = transcribe_both(
            args.audio_path,
            language=args.language,
            model_name=args.model,
            device=args.device,
            fast_mode=args.fast_mode,
            preprocess=args.preprocess,
        )
    else:
        transcript_result = transcribe_audio(
            args.audio_path,
            language=args.language,
            model_name=args.model,
            device=args.device,
            stt_provider=args.stt_provider,
            fast_mode=args.fast_mode,
            preprocess=args.preprocess,
        )

    if args.output:
        write_transcript_outputs(Path(args.output), args.stt_provider, transcript_result)

    if args.stt_provider == "both":
        print(json.dumps(transcript_result, ensure_ascii=False))
    else:
        print(transcript_result)


if __name__ == "__main__":
    main()
