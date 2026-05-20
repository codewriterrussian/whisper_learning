from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import sys
import time
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.stt_providers import AppleSpeechProvider, STTProvider, WhisperProvider
from scripts.audio_similarity import preprocess_audio

DEFAULT_STT_PROVIDER = "whisper"
ALLOWED_STT_PROVIDERS = {"whisper", "apple", "both"}


def get_provider(
    provider_name: str = DEFAULT_STT_PROVIDER,
    language: Optional[str] = None,
    model_name: Optional[str] = None,
    device: Optional[str] = None,
    fast_mode: bool = True,
) -> STTProvider:
    """Create an STT provider by name."""
    normalized_provider = (provider_name or DEFAULT_STT_PROVIDER).lower()

    if normalized_provider == "whisper":
        return WhisperProvider(language=language, model_name=model_name, device=device, fast_mode=fast_mode)

    if normalized_provider == "apple":
        return AppleSpeechProvider(language=language)

    allowed = ", ".join(sorted(ALLOWED_STT_PROVIDERS))
    raise ValueError(f"Unknown STT provider: {provider_name}. Expected one of: {allowed}")


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
    """Transcribe with Whisper and Apple Speech, preserving Whisper if Apple fails."""
    prepared_audio_path = preprocess_audio(audio_path) if preprocess else Path(audio_path)
    result: dict[str, Any] = {
        "whisper": {"status": "pending", "transcript": "", "error": ""},
        "apple": {"status": "pending", "transcript": "", "error": ""},
        "_timings": {"whisperMs": 0, "appleMs": 0},
    }

    def run_whisper() -> tuple[dict[str, Any], int]:
        started = time.perf_counter()
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
        return provider_result, round((time.perf_counter() - started) * 1000)

    def run_apple() -> tuple[dict[str, Any], int]:
        started = time.perf_counter()
        provider_result: dict[str, Any] = {"status": "pending", "transcript": "", "error": ""}
        try:
            provider = get_provider("apple", language=language)
            provider_result["transcript"] = provider.transcribe(str(prepared_audio_path))
            provider_result["status"] = "ok"
        except Exception as error:  # Apple Speech is optional and experimental.
            provider_result["status"] = "failed"
            provider_result["error"] = str(error)
        return provider_result, round((time.perf_counter() - started) * 1000)

    with ThreadPoolExecutor(max_workers=2) as executor:
        whisper_future = executor.submit(run_whisper)
        apple_future = executor.submit(run_apple)
        result["whisper"], result["_timings"]["whisperMs"] = whisper_future.result()
        result["apple"], result["_timings"]["appleMs"] = apple_future.result()

    return result


def write_transcript_outputs(output_path: Path, stt_provider: str, transcript_result: str | dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if stt_provider == "both":
        assert isinstance(transcript_result, dict)
        whisper_path = output_path.with_name(f"{output_path.stem}.whisper.txt")
        apple_path = output_path.with_name(f"{output_path.stem}.apple.txt")
        whisper_path.write_text(f"{transcript_result['whisper']['transcript']}\n", encoding="utf-8")
        apple_path.write_text(f"{transcript_result['apple']['transcript']}\n", encoding="utf-8")
        output_path.write_text(f"{transcript_result['whisper']['transcript']}\n", encoding="utf-8")
        return

    assert isinstance(transcript_result, str)
    output_path.write_text(f"{transcript_result}\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe an audio file with a selectable STT provider.")
    parser.add_argument("audio_path", help="Audio file to transcribe.")
    parser.add_argument("--language", default=None, help="Whisper language hint, for example en, de, ja, zh.")
    parser.add_argument("--model", default=None, help="Whisper model name, for example base, medium, large.")
    parser.add_argument("--device", default=None, help="Whisper device: auto, cpu, or mps.")
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
