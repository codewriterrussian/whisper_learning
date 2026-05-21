#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for dir in recordings transcripts results runs model_audio generated_reports; do
  if [[ -e "$dir" ]]; then
    rm -rf "$dir"
    echo "Removed $dir"
  fi
done

mkdir -p recordings transcripts results runs model_audio generated_reports
echo "Local generated practice data cleared."
