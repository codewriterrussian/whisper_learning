from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.stt_model import transcribe_audio  # noqa: E402

AUDIO = ROOT / "recordings" / "my_recording.wav"


if __name__ == "__main__":
    text = transcribe_audio(AUDIO, language=None)
    print(text)
