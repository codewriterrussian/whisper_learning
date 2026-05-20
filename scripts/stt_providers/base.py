from __future__ import annotations

from abc import ABC, abstractmethod


class STTProvider(ABC):
    """Speech-to-text provider interface."""

    @abstractmethod
    def transcribe(self, audio_path: str) -> str:
        """Transcribe an audio file and return plain text."""
