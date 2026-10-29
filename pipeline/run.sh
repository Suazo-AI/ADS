#!/usr/bin/env bash
# Build one episode end to end and verify it.
#   pipeline/run.sh 001-tickle
# Optional env: PIPER_VOICES_DIR, ASSEMBLYAI_API_KEY, REMOTION_BROWSER (Chrome binary).
set -euo pipefail
EP=${1:?usage: run.sh <episode-id>}
cd "$(dirname "$0")"
mkdir -p out
LOG=out/$EP.timings.tsv
printf "step\tseconds\n" > "$LOG"

step() {
  local name=$1; shift
  local t0=$EPOCHREALTIME
  echo "== $name"
  "$@"
  awk -v n="$name" -v a="$t0" -v b="$EPOCHREALTIME" 'BEGIN { printf "%s\t%.1f\n", n, b - a }' >> "$LOG"
}

step voice     python3 tools/tts.py "$EP"
step align     python3 tools/align.py "$EP"
step sfx       python3 tools/sfx.py
step render    bash -c "cd studio && npx remotion render Episode ../out/$EP.raw.mp4 --props='{\"episodeId\":\"$EP\"}' --concurrency=4 --crf=18 ${REMOTION_BROWSER:+--browser-executable=$REMOTION_BROWSER} --log=error"
step master    python3 tools/post.py "out/$EP.raw.mp4" "out/$EP.mp4"
step retranscribe python3 tools/transcribe.py "out/$EP.mp4" "out/$EP.heard.json"
step measure   python3 tools/measure.py "out/$EP.mp4" --words "out/$EP.heard.json" -o "out/$EP.metrics.json" --sheet "out/$EP.cuts.png"
step wer       bash -c "python3 tools/wer.py $EP out/$EP.heard.json | tee out/$EP.wer.txt"
cat "$LOG"
