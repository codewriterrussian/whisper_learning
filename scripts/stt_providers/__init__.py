from __future__ import annotations

from .apple_speech_provider import AppleSpeechProvider
from .base import STTProvider
from .colab_whisper_provider import ColabWhisperProvider
from .whisper_provider import WhisperProvider

__all__ = ["AppleSpeechProvider", "ColabWhisperProvider", "STTProvider", "WhisperProvider"]
