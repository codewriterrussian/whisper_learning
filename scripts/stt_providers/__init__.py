from __future__ import annotations

from .apple_speech_provider import AppleSpeechProvider
from .base import STTProvider
from .colab_whisper_provider import ColabWhisperProvider
from .whisper_provider import WhisperProvider
from .windows_speech_provider import WindowsSpeechProvider

__all__ = ["AppleSpeechProvider", "ColabWhisperProvider", "STTProvider", "WhisperProvider", "WindowsSpeechProvider"]
