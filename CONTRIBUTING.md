# Contributing

This project is currently a local-first pronunciation practice app. Contributions should keep that scope clear and avoid adding hosted services or remote recording upload behavior unless it is explicitly discussed first.

## Development

1. Create a Python environment and install `requirements.txt`.
2. Install Node dependencies in `backend/` and `frontend/`.
3. Run the checks before opening a change:

```bash
./scripts/run_all_tests.sh
```

On Windows:

```powershell
.\scripts\run_all_tests.ps1
```

## Guidelines

- Keep Whisper as the primary STT provider.
- Keep Apple STT optional and macOS-only; Windows defaults to Whisper only.
- Do not commit generated recordings, transcripts, run outputs, model audio, or local cache files.
- Keep public-facing UI text clear for beginner students.
- Add tests for provider selection, platform behavior, storage paths, and invalid transcript handling when changing those areas.
