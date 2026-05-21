#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON_BIN="${PYTHON:-python}"

"$PYTHON_BIN" -m unittest tests.test_stt_providers
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
