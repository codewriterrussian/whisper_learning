#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
import sys

from rapidfuzz import fuzz

TARGET_FILE = Path("targets/target.txt")
TRANSCRIPT_FILE = Path("transcripts/my_recording.txt")
WHISPER_TRANSCRIPT_FILE = Path("transcripts/my_recording.whisper.txt")
APPLE_TRANSCRIPT_FILE = Path("transcripts/my_recording.apple.txt")
OUT_FILE = Path("results/comparison.txt")


@dataclass
class ScoreResult:
    exact_ratio: float
    partial_ratio: float
    token_sort_ratio: float
    feedback: str


@dataclass
class TranscriptValidation:
    status: str
    reason: str = ""


FILLER_NOISE_TOKENS = {
    "ah",
    "eh",
    "er",
    "hm",
    "hmm",
    "hmmm",
    "mm",
    "mmm",
    "uh",
    "um",
    "umm",
    "noise",
    "silence",
    "inaudible",
    "unintelligible",
    "unknown",
    "background",
    "music",
}


def normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[\n\r]+", " ", text)
    text = re.sub(r"[^\w\sÀ-ÿĀ-žА-яЁё一-龥ぁ-んァ-ンー]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def get_transcript_validation_debug(provider_name: str, transcript: str, reason: str = "") -> str:
    text = transcript or ""
    normalized = normalize(text)
    non_space_chars = [char for char in text if not char.isspace()]
    symbols = [char for char in non_space_chars if not char.isalnum()]
    symbol_ratio = len(symbols) / len(non_space_chars) if non_space_chars else 0
    words = re.findall(r"[\wÀ-ÿĀ-žА-яЁё一-龥ぁ-んァ-ンー]+", normalized.lower())
    alphabetic_count = sum(1 for char in normalized if char.isalpha())
    return (
        f"[transcript-validation] provider={provider_name} "
        f"raw={text!r} normalized={normalized!r} "
        f"alphabetic_count={alphabetic_count} "
        f"symbol_ratio={symbol_ratio:.3f} "
        f"words={words!r} "
        f"invalid_reason={reason!r}"
    )


def validate_transcript(transcript: str) -> TranscriptValidation:
    text = (transcript or "").strip()
    if not text:
        return TranscriptValidation("invalid", "empty transcript")

    non_space_chars = [char for char in text if not char.isspace()]
    if not non_space_chars:
        return TranscriptValidation("invalid", "empty transcript")

    compact = "".join(non_space_chars)
    if len(compact) >= 6 and len(set(compact)) == 1 and not compact[0].isalnum():
        return TranscriptValidation("invalid", "repeated punctuation")

    normalized = normalize(text)
    if not any(char.isalpha() for char in normalized):
        return TranscriptValidation("invalid", "no alphabetic letters after normalization")

    words = re.findall(r"[\wÀ-ÿĀ-žА-яЁё一-龥ぁ-んァ-ンー]+", normalized.lower())
    alphabetic_words = [word for word in words if any(char.isalpha() for char in word)]
    symbols = [char for char in non_space_chars if not char.isalnum()]
    symbol_ratio = len(symbols) / len(non_space_chars)
    if not alphabetic_words and symbol_ratio > 0.85:
        return TranscriptValidation("invalid", "no valid language words and mostly punctuation or symbols")

    if all(word in FILLER_NOISE_TOKENS for word in alphabetic_words):
        return TranscriptValidation("invalid", "only filler or noise tokens")

    return TranscriptValidation("ok")


def score_transcript(target: str, transcript: str) -> ScoreResult:
    normalized_target = normalize(target)
    normalized_transcript = normalize(transcript)
    ratio = fuzz.ratio(normalized_target, normalized_transcript)
    partial = fuzz.partial_ratio(normalized_target, normalized_transcript)
    token_sort = fuzz.token_sort_ratio(normalized_target, normalized_transcript)

    if ratio >= 95:
        feedback = "Excellent. STT understood almost exactly the target sentence."
    elif ratio >= 85:
        feedback = "Good. Some small pronunciation, word, or rhythm issue may exist."
    elif ratio >= 70:
        feedback = "Understandable, but several words may need clearer pronunciation."
    else:
        feedback = "Needs practice. Slow down, listen again, and repeat in smaller chunks."

    return ScoreResult(
        exact_ratio=ratio,
        partial_ratio=partial,
        token_sort_ratio=token_sort,
        feedback=feedback,
    )


def format_single_result(
    target_raw: str,
    transcript_raw: str,
    provider_label: str = "Whisper",
    provider_status: str = "ok",
    provider_note: str = "",
) -> str:
    validation = validate_transcript(transcript_raw) if provider_status in {"ok", "ok_retry"} else TranscriptValidation(provider_status, provider_note)
    valid_transcript = validation.status == "ok"
    score = score_transcript(target_raw, transcript_raw) if valid_transcript else None
    target = normalize(target_raw)
    transcript = normalize(transcript_raw) if valid_transcript else ""
    display_transcript = transcript_raw if valid_transcript else ""
    score_block = (
        f"""Similarity score:
- Exact-style ratio: {score.exact_ratio:.1f}/100
- Partial ratio: {score.partial_ratio:.1f}/100
- Token-sort ratio: {score.token_sort_ratio:.1f}/100

Feedback:
{score.feedback}
"""
        if score
        else f"""Similarity score:
--

Status:
{validation.status}

Note:
{validation.reason or provider_note or "No valid STT transcript was produced. Please check microphone volume or record again."}

Feedback:
No valid STT transcript was produced. Please check microphone volume or record again.
"""
    )

    return f"""# Speaking Practice Comparison

Target sentence:
{target_raw}

{provider_label} transcription:
{display_transcript}

Normalized target:
{target}

Normalized transcription:
{transcript}

{score_block}

Practice suggestion:
1. Listen to the model audio again.
2. Repeat sentence in 2-3 smaller chunks.
3. Record again.
4. Aim for 90+ similarity, then focus on rhythm and intonation.
"""


def format_score_block(provider_name: str, transcript: str, status: str, score: ScoreResult | None, note: str = "") -> str:
    if score is None:
        display_transcript = transcript if status == "ok" else ""
        return f"""{provider_name} STT:
Transcript:
{display_transcript}
Score:
--
Status:
{status}
Note:
{note}
"""

    return f"""{provider_name} STT:
Transcript:
{transcript}
Score:
- Exact-style ratio: {score.exact_ratio:.1f}/100
- Partial ratio: {score.partial_ratio:.1f}/100
- Token-sort ratio: {score.token_sort_ratio:.1f}/100
Status:
{status}
Feedback:
{score.feedback}
"""


def format_combined_result(
    target_raw: str,
    whisper_transcript: str,
    apple_transcript: str = "",
    whisper_status: str = "ok",
    whisper_note: str = "",
    apple_status: str = "unavailable",
    apple_note: str = "",
    native_provider_name: str = "Apple",
) -> str:
    if whisper_status in {"ok", "ok_retry"}:
        whisper_validation = validate_transcript(whisper_transcript)
        whisper_status = whisper_status if whisper_validation.status == "ok" else whisper_validation.status
        whisper_note = whisper_validation.reason
    if apple_status in {"ok", "ok_retry"}:
        apple_validation = validate_transcript(apple_transcript)
        apple_status = apple_status if apple_validation.status == "ok" else apple_validation.status
        apple_note = apple_validation.reason

    whisper_score = score_transcript(target_raw, whisper_transcript) if whisper_status in {"ok", "ok_retry"} else None
    apple_score = score_transcript(target_raw, apple_transcript) if apple_status in {"ok", "ok_retry"} else None
    practice_suggestion = (
        "No valid STT transcript was produced. Please check microphone volume or record again."
        if whisper_score is None and apple_score is None
        else "\n".join([
            "1. Compare the available STT transcripts.",
            "2. Ignore providers marked failed, unavailable, or invalid.",
            "3. Record again after practicing unclear words slowly.",
            f"4. Use {native_provider_name} STT as experimental comparison only.",
        ])
    )

    return f"""# Speaking Practice Comparison

Target:
{target_raw}

{format_score_block("Whisper", whisper_transcript, whisper_status, whisper_score, whisper_note)}

{format_score_block(native_provider_name, apple_transcript, apple_status, apple_score, apple_note)}

Practice suggestion:
{practice_suggestion}
"""


def read_text(path: Path, required: bool = True) -> str:
    if not path.exists():
        if required:
            raise FileNotFoundError(f"Missing file: {path}")
        return ""

    return path.read_text(encoding="utf-8").strip()


def write_result(result: str, out_file: Path = OUT_FILE) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(result, encoding="utf-8")
    print(result)
    print(f"Saved to: {out_file}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare target text against one or two STT transcripts.")
    parser.add_argument("--stt-provider", choices=["whisper", "apple", "colab_whisper", "both"], default="whisper")
    parser.add_argument("--whisper-status", default="ok")
    parser.add_argument("--whisper-note", default="")
    parser.add_argument("--apple-status", default="ok")
    parser.add_argument("--apple-note", default="")
    parser.add_argument("--native-provider-name", default="Apple")
    parser.add_argument("--native-status", default="")
    parser.add_argument("--native-note", default="")
    parser.add_argument("--target-file", default=str(TARGET_FILE))
    parser.add_argument("--transcript-file", default=str(TRANSCRIPT_FILE))
    parser.add_argument("--whisper-transcript-file", default=str(WHISPER_TRANSCRIPT_FILE))
    parser.add_argument("--apple-transcript-file", default=str(APPLE_TRANSCRIPT_FILE))
    parser.add_argument("--native-transcript-file", default="")
    parser.add_argument("--out-file", default=str(OUT_FILE))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    target_raw = read_text(Path(args.target_file))
    out_file = Path(args.out_file)

    if args.stt_provider == "both":
        whisper_transcript = read_text(Path(args.whisper_transcript_file))
        native_transcript_file = Path(args.native_transcript_file or args.apple_transcript_file)
        native_transcript = read_text(native_transcript_file, required=False)
        native_status = args.native_status or args.apple_status
        native_note = args.native_note or args.apple_note
        write_result(
            format_combined_result(
                target_raw,
                whisper_transcript,
                native_transcript,
                whisper_status=args.whisper_status,
                whisper_note=args.whisper_note,
                apple_status=native_status,
                apple_note=native_note,
                native_provider_name=args.native_provider_name,
            ),
            out_file=out_file,
        )
        return

    transcript_raw = read_text(Path(args.transcript_file))
    provider_labels = {"apple": "Apple Speech", "colab_whisper": "Colab Whisper", "whisper": "Whisper"}
    label = provider_labels.get(args.stt_provider, "Whisper")
    if args.stt_provider == "apple":
        provider_status = args.apple_status
        provider_note = args.apple_note
    elif args.stt_provider == "colab_whisper":
        provider_status = args.native_status or args.apple_status
        provider_note = args.native_note or args.apple_note
    else:
        provider_status = args.whisper_status
        provider_note = args.whisper_note
    write_result(
        format_single_result(target_raw, transcript_raw, provider_label=label, provider_status=provider_status, provider_note=provider_note),
        out_file=out_file,
    )


if __name__ == "__main__":
    main()
