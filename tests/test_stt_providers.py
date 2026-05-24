from __future__ import annotations

import os
import platform
import sys
import tempfile
from types import SimpleNamespace
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.compare import format_combined_result, format_single_result, validate_transcript  # noqa: E402
from scripts.audio_similarity import SAMPLE_RATE, auto_trim_audio, compare_audio  # noqa: E402
from scripts.stt_model import (  # noqa: E402
    ALLOWED_STT_PROVIDERS,
    DEFAULT_STT_PROVIDER,
    get_available_stt_providers,
    get_native_provider_name,
    get_platform_key,
    get_provider,
    transcribe_both,
)
from scripts.stt_providers import AppleSpeechProvider, ColabWhisperProvider, WhisperProvider  # noqa: E402
import scripts.stt_providers.whisper_provider as whisper_provider_module  # noqa: E402


class FakeProvider:
    def __init__(self, transcript: str = "", error: Exception | None = None) -> None:
        self.transcript = transcript
        self.error = error

    def transcribe(self, _audio_path: str) -> str:
        if self.error:
            raise self.error
        return self.transcript


class STTProviderTests(unittest.TestCase):
    def test_whisper_remains_default(self) -> None:
        self.assertEqual(DEFAULT_STT_PROVIDER, "whisper")
        self.assertIsInstance(get_provider(), WhisperProvider)

    def test_provider_selection(self) -> None:
        self.assertIn("both", ALLOWED_STT_PROVIDERS)
        self.assertIn("colab_whisper", ALLOWED_STT_PROVIDERS)
        self.assertIsInstance(get_provider("whisper"), WhisperProvider)
        self.assertIsInstance(get_provider("apple"), AppleSpeechProvider)
        self.assertIsInstance(get_provider("colab_whisper"), ColabWhisperProvider)

    def test_platform_provider_availability(self) -> None:
        self.assertEqual(get_platform_key("Darwin"), "darwin")
        self.assertEqual(get_platform_key("Windows"), "win32")
        self.assertEqual(get_platform_key("Linux"), "linux")
        self.assertEqual(get_native_provider_name("darwin"), "apple")
        self.assertIsNone(get_native_provider_name("win32"))
        self.assertIsNone(get_native_provider_name("linux"))
        self.assertEqual(get_available_stt_providers("darwin"), ["whisper", "apple", "both", "colab_whisper"])
        self.assertEqual(get_available_stt_providers("win32"), ["whisper", "colab_whisper"])
        self.assertEqual(get_available_stt_providers("linux"), ["whisper", "colab_whisper"])

    def test_native_providers_disabled_off_platform(self) -> None:
        self.assertNotIn("apple", get_available_stt_providers("win32"))
        self.assertNotIn("apple", get_available_stt_providers("linux"))

    def test_whisper_defaults_to_large_fast_mode(self) -> None:
        provider = get_provider("whisper")
        self.assertIsInstance(provider, WhisperProvider)
        self.assertEqual(provider.model_name, "large")
        self.assertTrue(provider.fast_mode)

    def test_polish_defaults_to_large(self) -> None:
        provider = get_provider("whisper", language="pl")
        self.assertIsInstance(provider, WhisperProvider)
        self.assertEqual(provider.language, "pl")
        self.assertEqual(provider.model_name, "large")

    def test_whisper_fast_mode_sets_decoding_options(self) -> None:
        captured_options = {}

        class FakeWhisperModel:
            def transcribe(self, _path: str, **options):
                captured_options.update(options)
                return {"text": "hello"}

        provider = WhisperProvider(language="pl", model_name="large", device="cpu", fast_mode=True)

        with patch.object(provider, "get_model", return_value=FakeWhisperModel()):
            transcript = provider.transcribe("README.md")

        self.assertEqual(transcript, "hello")
        self.assertEqual(captured_options["language"], "pl")
        self.assertEqual(captured_options["beam_size"], 1)
        self.assertEqual(captured_options["best_of"], 1)
        self.assertEqual(captured_options["temperature"], 0)
        self.assertFalse(captured_options["condition_on_previous_text"])
        self.assertFalse(captured_options["word_timestamps"])

    def test_mps_not_selected_outside_macos(self) -> None:
        provider = WhisperProvider(model_name="large", device="mps")
        with patch("scripts.stt_providers.whisper_provider.platform.system", return_value="Linux"):
            self.assertEqual(provider.resolve_device(), "cpu")

    def test_auto_uses_cuda_when_available_off_macos(self) -> None:
        provider = WhisperProvider(model_name="large", device="auto")
        with (
            patch("scripts.stt_providers.whisper_provider.platform.system", return_value="Linux"),
            patch.object(whisper_provider_module.torch.cuda, "is_available", return_value=True),
        ):
            self.assertEqual(provider.resolve_device(), "cuda")

    def test_auto_uses_cpu_on_macos_for_release_stability(self) -> None:
        provider = WhisperProvider(model_name="large", device="auto")
        with patch("scripts.stt_providers.whisper_provider.platform.system", return_value="Darwin"):
            self.assertEqual(provider.resolve_device(), "cpu")

    def test_auto_falls_back_to_cpu_without_accelerator(self) -> None:
        provider = WhisperProvider(model_name="large", device="auto")
        with (
            patch("scripts.stt_providers.whisper_provider.platform.system", return_value="Linux"),
            patch.object(whisper_provider_module.torch.cuda, "is_available", return_value=False),
        ):
            self.assertEqual(provider.resolve_device(), "cpu")

    def test_large_model_cache_reuses_model_by_name_and_device(self) -> None:
        whisper_provider_module._MODEL_CACHE.clear()
        loaded_models = []

        def fake_load_model(model_name: str, device: str):
            model = object()
            loaded_models.append((model_name, device, model))
            return model

        fake_whisper = SimpleNamespace(load_model=fake_load_model)
        first_provider = WhisperProvider(model_name="large", device="cpu")
        second_provider = WhisperProvider(model_name="large", device="cpu")

        with patch.dict(sys.modules, {"whisper": fake_whisper}):
            first_model = first_provider.get_model()
            second_model = second_provider.get_model()

        self.assertIs(first_model, second_model)
        self.assertEqual(len(loaded_models), 1)
        self.assertEqual(loaded_models[0][:2], ("large", "cpu"))

    def test_apple_provider_uses_language_locale(self) -> None:
        provider = get_provider("apple", language="pl")
        self.assertIsInstance(provider, AppleSpeechProvider)
        self.assertEqual(provider.locale, "pl-PL")

    def test_both_mode_keeps_whisper_when_apple_fails(self) -> None:
        def fake_get_provider(provider_name: str, **_kwargs):
            if provider_name == "whisper":
                return FakeProvider("whisper transcript")
            if provider_name == "apple":
                return FakeProvider(error=RuntimeError("Apple unavailable"))
            raise AssertionError(provider_name)

        with (
            patch("scripts.stt_model.get_provider", side_effect=fake_get_provider),
            patch("scripts.stt_model.get_native_provider_name", return_value="apple"),
        ):
            result = transcribe_both("recordings/my_recording.wav", preprocess=False)

        self.assertEqual(result["whisper"]["status"], "ok")
        self.assertEqual(result["whisper"]["transcript"], "whisper transcript")
        self.assertEqual(result["apple"]["status"], "failed")
        self.assertIn("Apple unavailable", result["apple"]["error"])

    def test_combined_result_format_includes_both_scores(self) -> None:
        result = format_combined_result(
            "hello world",
            "hello world",
            "hello",
            apple_status="ok",
        )

        self.assertIn("Whisper STT:", result)
        self.assertIn("Apple STT:", result)
        self.assertIn("Score:", result)
        self.assertIn("Status:\nok", result)

    def test_repeated_exclamation_transcript_is_invalid(self) -> None:
        result = validate_transcript("!!!!!!!!!!!!")
        self.assertEqual(result.status, "invalid")
        self.assertIn("punctuation", result.reason)

    def test_empty_transcript_is_invalid(self) -> None:
        result = validate_transcript("   \n\t")
        self.assertEqual(result.status, "invalid")
        self.assertIn("empty", result.reason)

    def test_normal_polish_sentence_is_valid(self) -> None:
        result = validate_transcript("Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm.")
        self.assertEqual(result.status, "ok")

    def test_polish_unicode_letters_count_as_alphabetic(self) -> None:
        result = validate_transcript("ąćęłńóśźż")
        self.assertEqual(result.status, "ok")

    def test_invalid_first_whisper_output_triggers_retry(self) -> None:
        class FakeWhisperModel:
            def __init__(self) -> None:
                self.calls = []

            def transcribe(self, _path: str, **options):
                self.calls.append(options)
                if len(self.calls) == 1:
                    return {"text": "!!!!!!!!!!!!!!!!"}
                return {"text": "Dzisiaj ćwiczę wyraźną wymowę"}

        model = FakeWhisperModel()
        provider = WhisperProvider(language="pl", model_name="large", device="cpu", fast_mode=True)

        with patch.object(Path, "exists", return_value=True), patch.object(provider, "get_model", return_value=model):
            result = provider.transcribe_with_retry("recordings/my_recording.wav")

        self.assertEqual(result["status"], "ok_retry")
        self.assertTrue(result["recovered"])
        self.assertEqual(result["transcript"], "Dzisiaj ćwiczę wyraźną wymowę")
        self.assertEqual(model.calls[0]["beam_size"], 1)
        self.assertEqual(model.calls[1]["beam_size"], 5)
        self.assertEqual(model.calls[1]["language"], "pl")
        self.assertEqual(model.calls[1]["fp16"], False)

    def test_mps_sparse_error_retries_once_on_cpu(self) -> None:
        class FakeWhisperModel:
            def __init__(self) -> None:
                self.calls = []

            def transcribe(self, _path: str, **options):
                self.calls.append(options)
                if len(self.calls) == 1:
                    raise RuntimeError("Could not run 'aten::empty.memory_format' with arguments from the 'SparseMPS' backend")
                return {"text": "hello world"}

        model = FakeWhisperModel()
        provider = WhisperProvider(language="en", model_name="large", device="mps", fast_mode=True)

        with (
            patch.object(Path, "exists", return_value=True),
            patch.object(provider, "get_model", return_value=model),
            patch("scripts.stt_providers.whisper_provider.platform.system", return_value="Darwin"),
            patch.object(whisper_provider_module.torch.backends.mps, "is_available", return_value=True),
        ):
            result = provider.transcribe_with_retry("recordings/my_recording.wav")

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["transcript"], "hello world")
        self.assertTrue(result["fallbackUsed"])
        self.assertEqual(result["fallbackReason"], "mps_sparse_backend_error")
        self.assertEqual(result["requestedDevice"], "mps")
        self.assertEqual(result["actualDevice"], "cpu")

    def test_retry_stays_on_mps_by_default_for_speed(self) -> None:
        class FakeWhisperModel:
            def __init__(self) -> None:
                self.calls = []

            def transcribe(self, _path: str, **options):
                self.calls.append(options)
                return {"text": "!!!!!!!!!!!!" if len(self.calls) == 1 else "hello world"}

        model = FakeWhisperModel()
        provider = WhisperProvider(language="en", model_name="large", device="mps", fast_mode=True)

        with (
            patch.object(Path, "exists", return_value=True),
            patch.object(provider, "resolve_device", return_value="mps"),
            patch.object(provider, "get_model", return_value=model),
        ):
            result = provider.transcribe_with_retry("recordings/my_recording.wav")

        self.assertEqual(result["status"], "ok_retry")
        self.assertEqual(result["retryDevice"], "mps")
        self.assertTrue(model.calls[1]["fp16"])

    def test_retry_can_force_cpu_with_env(self) -> None:
        class FakeWhisperModel:
            def __init__(self) -> None:
                self.calls = []

            def transcribe(self, _path: str, **options):
                self.calls.append(options)
                return {"text": "!!!!!!!!!!!!" if len(self.calls) == 1 else "hello world"}

        model = FakeWhisperModel()
        provider = WhisperProvider(language="en", model_name="large", device="mps", fast_mode=True)

        with (
            patch.dict(os.environ, {"WHISPER_RETRY_DEVICE": "cpu"}),
            patch.object(Path, "exists", return_value=True),
            patch.object(provider, "resolve_device", side_effect=lambda force_device=None: force_device or "mps"),
            patch.object(provider, "get_model", return_value=model),
        ):
            provider.retry_device_policy = os.environ["WHISPER_RETRY_DEVICE"]
            result = provider.transcribe_with_retry("recordings/my_recording.wav")

        self.assertEqual(result["status"], "ok_retry")
        self.assertEqual(result["retryDevice"], "cpu")
        self.assertFalse(model.calls[1]["fp16"])

    def test_retry_transcript_is_used_if_valid(self) -> None:
        class FakeWhisperModel:
            def __init__(self) -> None:
                self.index = 0

            def transcribe(self, _path: str, **_options):
                self.index += 1
                return {"text": "!!!!!!!!!!!!" if self.index == 1 else "hello world"}

        provider = WhisperProvider(language="en", model_name="large", device="cpu", fast_mode=True)

        with patch.object(Path, "exists", return_value=True), patch.object(provider, "get_model", return_value=FakeWhisperModel()):
            result = provider.transcribe_with_retry("recordings/my_recording.wav")

        self.assertEqual(result["status"], "ok_retry")
        self.assertEqual(result["transcript"], "hello world")

    def test_apple_fallback_still_works_if_whisper_retry_fails(self) -> None:
        class FailedRetryWhisper(WhisperProvider):
            def __init__(self) -> None:
                pass

            def transcribe_with_retry(self, _audio_path: str):
                return {"status": "invalid", "transcript": "", "error": "repeated punctuation", "recovered": False}

        def fake_get_provider(provider_name: str, **_kwargs):
            if provider_name == "whisper":
                return FailedRetryWhisper()
            if provider_name == "apple":
                return FakeProvider("apple transcript")
            raise AssertionError(provider_name)

        with (
            patch("scripts.stt_model.get_provider", side_effect=fake_get_provider),
            patch("scripts.stt_model.get_native_provider_name", return_value="apple"),
        ):
            result = transcribe_both("recordings/my_recording.wav", preprocess=False)

        self.assertEqual(result["whisper"]["status"], "invalid")
        self.assertEqual(result["apple"]["status"], "ok")
        self.assertEqual(result["apple"]["transcript"], "apple transcript")

    def test_whisper_invalid_apple_valid_still_scores_apple(self) -> None:
        result = format_combined_result(
            "Dzisiaj ćwiczę wyraźną wymowę.",
            "!!!!!!!!!!!!",
            "Dzisiaj ćwiczę wyraźną wymowę.",
            apple_status="ok",
        )

        self.assertIn("Whisper STT:", result)
        self.assertIn("Status:\ninvalid", result)
        self.assertIn("Apple STT:", result)
        self.assertIn("- Exact-style ratio: 100.0/100", result)

    def test_invalid_transcript_is_not_used_for_focus_input(self) -> None:
        result = format_combined_result(
            "hello world",
            "!!!!!!!!!!!!",
            "",
            apple_status="skipped",
        )

        self.assertIn("No valid STT transcript was produced", result)
        self.assertNotIn("- Exact-style ratio: 0.0/100", result)

    def test_colab_whisper_unavailable_without_url(self) -> None:
        provider = ColabWhisperProvider(endpoint_url="")
        result = provider.transcribe_result("README.md")

        self.assertEqual(result["provider"], "colab_whisper")
        self.assertEqual(result["status"], "unavailable")
        self.assertIn("not configured", result["error"])
        self.assertIsNone(result["score"])

    def test_failed_colab_request_does_not_score_zero(self) -> None:
        result = format_single_result(
            "hello world",
            "",
            provider_label="Colab Whisper",
            provider_status="failed",
            provider_note="Colab disconnected",
        )

        self.assertIn("Status:\nfailed", result)
        self.assertIn("Similarity score:\n--", result)
        self.assertNotIn("0.0/100", result)

    def test_mocked_valid_colab_response_returns_ok(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self) -> bytes:
                return b'{"status":"ok","transcript":"hello world","model":"large-v3-turbo","device":"cuda","timeSec":1.2}'

        with tempfile.NamedTemporaryFile(suffix=".wav") as audio_file:
            audio_file.write(b"fake audio")
            audio_file.flush()
            provider = ColabWhisperProvider(
                language="en",
                model_name="large-v3-turbo",
                endpoint_url="https://example.test/transcribe",
                timeout_seconds=3,
            )
            with patch("scripts.stt_providers.colab_whisper_provider.urllib.request.urlopen", return_value=FakeResponse()) as urlopen:
                result = provider.transcribe_result(audio_file.name)

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["transcript"], "hello world")
        self.assertEqual(result["model"], "large-v3-turbo")
        self.assertEqual(result["device"], "cuda")
        self.assertTrue(urlopen.called)

    def test_invalid_colab_transcript_is_marked_invalid_for_scoring(self) -> None:
        result = format_single_result(
            "hello world",
            "!!!!!!!!!!!!!!!!",
            provider_label="Colab Whisper",
            provider_status="ok",
        )

        self.assertIn("Status:\ninvalid", result)
        self.assertIn("Similarity score:\n--", result)
        self.assertNotIn("- Exact-style ratio: 0.0/100", result)

    def test_audio_similarity_failure_is_nonfatal(self) -> None:
        result = compare_audio("missing-model.wav", "missing-user.wav")
        self.assertEqual(result.status, "unavailable")
        self.assertIn("unavailable", result.pace_hint)

    def test_auto_trim_audio_reports_removed_silence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.wav"
            output = Path(tmp) / "trimmed.wav"
            samples = [0] * int(SAMPLE_RATE * 0.35)
            samples += [12000] * int(SAMPLE_RATE * 0.4)
            samples += [0] * int(SAMPLE_RATE * 0.35)

            with wave.open(str(source), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(SAMPLE_RATE)
                wav.writeframes(b"".join(sample.to_bytes(2, "little", signed=True) for sample in samples))

            result = auto_trim_audio(source, output)

            self.assertEqual(result["status"], "ok")
            self.assertTrue(output.exists())
            self.assertGreater(result["silence_removed"], 0)

    def test_apple_provider_clear_error_on_non_macos(self) -> None:
        if platform.system() == "Darwin":
            self.skipTest("Non-macOS error path only.")

        provider = get_provider("apple")
        with self.assertRaisesRegex(RuntimeError, "macOS-only"):
            provider.transcribe("recordings/my_recording.wav")

    @unittest.skipUnless(platform.system() == "Darwin", "Apple Speech STT is macOS-only.")
    @unittest.skipUnless(os.environ.get("RUN_APPLE_STT_SMOKE") == "1", "Set RUN_APPLE_STT_SMOKE=1 to run Apple Speech.")
    def test_apple_provider_smoke(self) -> None:
        audio_path = ROOT / "recordings" / "my_recording.wav"
        self.assertTrue(audio_path.exists(), f"Missing smoke-test audio: {audio_path}")
        transcript = get_provider("apple").transcribe(str(audio_path))
        self.assertIsInstance(transcript, str)


if __name__ == "__main__":
    unittest.main()
