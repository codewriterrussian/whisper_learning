# Advanced Language Learning Targets

Status key: `[ ]` not started, `[~]` in progress, `[x]` done, `[!]` needs user feedback.

- [x] Add a Practice History panel for browsing previous checked sessions.
- [x] Persist recording attempts and audio blobs with IndexedDB so refresh does not lose current attempts.
- [x] Add a side-by-side attempt comparison view.
- [x] Add advanced word-level feedback for substitutions and close matches.
- [x] Add fluency and timing analysis: duration, pace, and pause hints.
- [!] Add true pronunciation scoring through a pronunciation-aware service or model. Needs user feedback.
- [x] Improve sentence chunking with grammar-aware or language-aware phrase splitting.
- [!] Add spaced repetition and weak-sentence review scheduling. Needs user feedback.
- [!] Add backend database storage for sessions, recordings, and progress. Needs user feedback.
- [x] Add audio waveform display and trimming.

## Implementation Notes

- Keep existing Express backend routes unchanged unless a target requires backend storage.
- For local persistence, prefer browser IndexedDB for audio blobs and localStorage for compact history summaries.
- Update this file as each target moves from in progress to done.
