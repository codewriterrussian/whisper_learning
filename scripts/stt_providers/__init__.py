from __future__ import annotations

from .apple_speech_provider import AppleSpeechProvider
from .base import STTProvider
from .whisper_provider import WhisperProvider
from .windows_speech_provider import WindowsSpeechProvider

__all__ = ["AppleSpeechProvider", "STTProvider", "WhisperProvider", "WindowsSpeechProvider"]
