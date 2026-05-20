from __future__ import annotations

import argparse
import json
import math
import subprocess
import wave
from dataclasses import asdict, dataclass
from pathlib import Path


SAMPLE_RATE = 16000
FRAME_SECONDS = 0.025
HOP_SECONDS = 0.010


@dataclass
class AudioFeatures:
    duration_seconds: float
    trimmed_duration_seconds: float
    silence_ratio: float
    silence_removed_seconds: float
    trim_start_seconds: float
    trim_end_seconds: float
    frame_features: list[list[float]]


@dataclass
class AudioSimilarityResult:
    timing_match: float
    rhythm_match: float
    acoustic_similarity: float
    model_duration: float
    user_duration: float
    duration_difference: float
    speed_ratio: float
    model_silence_ratio: float
    user_silence_ratio: float
    user_silence_removed: float
    main_issue: str
    pace_hint: str
    auto_trimmed_path: str = ""
    status: str = "ok"
    note: str = ""


def _run_ffmpeg(source_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source_path),
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "1",
            "-af",
            "loudnorm=I=-20:TP=-1.5:LRA=11",
            "-c:a",
            "pcm_s16le",
            str(output_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def preprocess_audio(source_path: str | Path, work_dir: str | Path = "recordings/processed_audio") -> Path:
    source = Path(source_path)
    if not source.exists():
        raise FileNotFoundError(f"Audio file not found: {source}")

    output_dir = Path(work_dir)
    output = output_dir / f"{source.stem}.16k.wav"

    if output.exists() and output.stat().st_mtime >= source.stat().st_mtime:
        return output

    _run_ffmpeg(source, output)
    return output


def _read_wav_samples(path: Path) -> list[float]:
    with wave.open(str(path), "rb") as wav:
        sample_width = wav.getsampwidth()
        frame_count = wav.getnframes()
        raw = wav.readframes(frame_count)

    if sample_width != 2:
        raise ValueError(f"Expected 16-bit wav after preprocessing, got sample width {sample_width}")

    samples = []
    for index in range(0, len(raw), 2):
        value = int.from_bytes(raw[index : index + 2], byteorder="little", signed=True)
        samples.append(value / 32768.0)
    return samples


def _rms(samples: list[float]) -> float:
    if not samples:
        return 0.0
    return math.sqrt(sum(sample * sample for sample in samples) / len(samples))


def _trim_silence(samples: list[float]) -> tuple[list[float], float, int, int]:
    if not samples:
        return samples, 1.0, 0, 0

    frame_size = int(SAMPLE_RATE * FRAME_SECONDS)
    hop = int(SAMPLE_RATE * HOP_SECONDS)
    frame_rms = []
    for start in range(0, max(1, len(samples) - frame_size + 1), hop):
        frame_rms.append((start, _rms(samples[start : start + frame_size])))

    peak = max((rms for _, rms in frame_rms), default=0.0)
    threshold = max(0.01, peak * 0.08)
    voiced_starts = [start for start, rms in frame_rms if rms >= threshold]
    silence_ratio = 1.0 - (len(voiced_starts) / max(1, len(frame_rms)))

    if not voiced_starts:
        return samples, silence_ratio, 0, len(samples)

    trim_start = max(0, voiced_starts[0] - frame_size)
    trim_end = min(len(samples), voiced_starts[-1] + frame_size * 2)
    return samples[trim_start:trim_end], silence_ratio, trim_start, trim_end


def _write_wav_samples(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wav:
      wav.setnchannels(1)
      wav.setsampwidth(2)
      wav.setframerate(SAMPLE_RATE)
      frames = bytearray()
      for sample in samples:
          value = int(max(-1.0, min(1.0, sample)) * 32767)
          frames.extend(value.to_bytes(2, byteorder="little", signed=True))
      wav.writeframes(bytes(frames))


def auto_trim_audio(source_path: str | Path, output_path: str | Path) -> dict[str, float | str]:
    wav_path = preprocess_audio(source_path)
    samples = _read_wav_samples(wav_path)
    trimmed_samples, silence_ratio, trim_start, trim_end = _trim_silence(samples)
    output = Path(output_path)
    _write_wav_samples(output, trimmed_samples)
    original_duration = len(samples) / SAMPLE_RATE
    trimmed_duration = len(trimmed_samples) / SAMPLE_RATE

    return {
        "status": "ok",
        "path": str(output),
        "original_duration": round(original_duration, 2),
        "trimmed_duration": round(trimmed_duration, 2),
        "silence_removed": round(max(0.0, original_duration - trimmed_duration), 2),
        "trim_start": round(trim_start / SAMPLE_RATE, 2),
        "trim_end": round(trim_end / SAMPLE_RATE, 2),
        "silence_ratio": round(silence_ratio, 3),
    }


def _zero_crossing_rate(frame: list[float]) -> float:
    if len(frame) < 2:
        return 0.0
    crossings = 0
    for index in range(1, len(frame)):
        if (frame[index - 1] < 0 <= frame[index]) or (frame[index - 1] >= 0 > frame[index]):
            crossings += 1
    return crossings / (len(frame) - 1)


def _frame_features(samples: list[float]) -> list[list[float]]:
    frame_size = int(SAMPLE_RATE * FRAME_SECONDS)
    hop = int(SAMPLE_RATE * HOP_SECONDS)
    features = []

    for start in range(0, max(1, len(samples) - frame_size + 1), hop):
        frame = samples[start : start + frame_size]
        if len(frame) < frame_size:
            frame = frame + [0.0] * (frame_size - len(frame))

        energy = _rms(frame)
        zcr = _zero_crossing_rate(frame)
        peak = max((abs(sample) for sample in frame), default=0.0)
        features.append([energy, zcr, peak])

    return features


def extract_features(audio_path: str | Path) -> AudioFeatures:
    wav_path = preprocess_audio(audio_path)
    samples = _read_wav_samples(wav_path)
    duration = len(samples) / SAMPLE_RATE
    trimmed_samples, silence_ratio, trim_start, trim_end = _trim_silence(samples)
    trimmed_duration = len(trimmed_samples) / SAMPLE_RATE

    return AudioFeatures(
        duration_seconds=duration,
        trimmed_duration_seconds=trimmed_duration,
        silence_ratio=silence_ratio,
        silence_removed_seconds=max(0.0, duration - trimmed_duration),
        trim_start_seconds=trim_start / SAMPLE_RATE,
        trim_end_seconds=trim_end / SAMPLE_RATE,
        frame_features=_frame_features(trimmed_samples),
    )


def _feature_distance(left: list[float], right: list[float]) -> float:
    return math.sqrt(sum((left[index] - right[index]) ** 2 for index in range(min(len(left), len(right)))))


def _dtw_distance(left: list[list[float]], right: list[list[float]]) -> float:
    if not left or not right:
        return 1.0

    previous = [float("inf")] * (len(right) + 1)
    previous[0] = 0.0

    for left_feature in left:
        current = [float("inf")] * (len(right) + 1)
        for right_index, right_feature in enumerate(right, start=1):
            cost = _feature_distance(left_feature, right_feature)
            current[right_index] = cost + min(
                previous[right_index],
                current[right_index - 1],
                previous[right_index - 1],
            )
        previous = current

    return previous[-1] / (len(left) + len(right))


def _ratio_score(left: float, right: float) -> float:
    if left <= 0 or right <= 0:
        return 0.0
    return max(0.0, min(left, right) / max(left, right) * 100.0)


def compare_audio(
    model_audio_path: str | Path,
    user_audio_path: str | Path,
    target_word_count: int | None = None,
    transcript_word_count: int | None = None,
) -> AudioSimilarityResult:
    try:
        model = extract_features(model_audio_path)
        user = extract_features(user_audio_path)
        timing_match = _ratio_score(model.trimmed_duration_seconds, user.trimmed_duration_seconds)
        silence_match = 100.0 - min(100.0, abs(model.silence_ratio - user.silence_ratio) * 160.0)

        if target_word_count and transcript_word_count and model.trimmed_duration_seconds and user.trimmed_duration_seconds:
            model_rate = target_word_count / model.trimmed_duration_seconds
            user_rate = transcript_word_count / user.trimmed_duration_seconds
            pace_score = _ratio_score(model_rate, user_rate)
        else:
            pace_score = timing_match

        rhythm_match = max(0.0, min(100.0, pace_score * 0.7 + silence_match * 0.3))
        acoustic_distance = _dtw_distance(model.frame_features, user.frame_features)
        acoustic_similarity = max(0.0, min(100.0, 100.0 * math.exp(-acoustic_distance * 10.0)))
        duration_difference = user.trimmed_duration_seconds - model.trimmed_duration_seconds
        speed_ratio = (
            user.trimmed_duration_seconds / model.trimmed_duration_seconds
            if model.trimmed_duration_seconds > 0
            else 0.0
        )
        silence_gap = abs(model.silence_ratio - user.silence_ratio)

        if abs(duration_difference) < 0.4:
            pace_hint = "Your timing is close to the model audio."
        elif duration_difference > 0:
            pace_hint = "Your pace is slower than the model audio."
        else:
            pace_hint = "Your pace is faster than the model audio."

        if timing_match < 75:
            main_issue = "pace"
        elif silence_gap > 0.2:
            main_issue = "silence"
        elif acoustic_similarity < 65:
            main_issue = "acoustic similarity"
        else:
            main_issue = "none"

        return AudioSimilarityResult(
            timing_match=round(timing_match, 1),
            rhythm_match=round(rhythm_match, 1),
            acoustic_similarity=round(acoustic_similarity, 1),
            model_duration=round(model.trimmed_duration_seconds, 2),
            user_duration=round(user.trimmed_duration_seconds, 2),
            duration_difference=round(duration_difference, 2),
            speed_ratio=round(speed_ratio, 2),
            model_silence_ratio=round(model.silence_ratio, 3),
            user_silence_ratio=round(user.silence_ratio, 3),
            user_silence_removed=round(user.silence_removed_seconds, 2),
            main_issue=main_issue,
            pace_hint=pace_hint,
        )
    except Exception as error:
        return AudioSimilarityResult(
            timing_match=0.0,
            rhythm_match=0.0,
            acoustic_similarity=0.0,
            model_duration=0.0,
            user_duration=0.0,
            duration_difference=0.0,
            speed_ratio=0.0,
            model_silence_ratio=0.0,
            user_silence_ratio=0.0,
            user_silence_removed=0.0,
            main_issue="unavailable",
            pace_hint="Fluency and timing match is unavailable for this attempt.",
            status="unavailable",
            note=str(error),
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare model and user audio using timing and acoustic features.")
    parser.add_argument("model_audio")
    parser.add_argument("user_audio", nargs="?")
    parser.add_argument("--trim-only", action="store_true")
    parser.add_argument("--output", default=None)
    parser.add_argument("--target-word-count", type=int, default=None)
    parser.add_argument("--transcript-word-count", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.trim_only:
        if not args.user_audio:
            raise SystemExit("--trim-only requires input audio and --output")
        if not args.output:
            raise SystemExit("--trim-only requires --output")
        print(json.dumps(auto_trim_audio(args.model_audio, args.output), ensure_ascii=False))
        return

    if not args.user_audio:
        raise SystemExit("user_audio is required unless --trim-only is used")

    result = compare_audio(
        args.model_audio,
        args.user_audio,
        target_word_count=args.target_word_count,
        transcript_word_count=args.transcript_word_count,
    )
    print(json.dumps(asdict(result), ensure_ascii=False))


if __name__ == "__main__":
    main()
