# Stickman episode pipeline

Script in, finished and checked vertical video out. One command:

```bash
pipeline/run.sh 001-tickle
```

| Step | Tool | Output |
|---|---|---|
| voice | `tools/tts.py` (Piper, local) | `studio/public/episodes/<id>/voice.wav`, `timeline.json` |
| align | `tools/align.py` (AssemblyAI if `ASSEMBLYAI_API_KEY` is set, else local Whisper) | `words.json`: every script word with start/end time |
| sfx | `tools/sfx.py` | synthesized sound effects, nothing to license |
| render | Remotion (`studio/`) | `out/<id>.raw.mp4` |
| master | `tools/post.py` | `out/<id>.mp4` at -14 LUFS / -1 dBTP |
| retranscribe | `tools/transcribe.py` | what the finished video actually says |
| measure | `tools/measure.py` + `tools/cuts.py` | `out/<id>.metrics.json`, `out/<id>.cuts.png` |
| wer | `tools/wer.py` | word error rate of the render vs. the script |

`out/<id>.timings.tsv` logs how long each step took.

## Writing an episode

`episodes/<id>/episode.json` holds the lines; each line names a scene. Scenes
live in `studio/src/scenes.tsx` and time their animation to spoken words
with `ctx.at("word")`, so nothing needs hand-timing when the voice changes.
The stickman rig and its pose library are in `studio/src/rig/`; render the
`RigSheet` composition to see every pose and expression.

## Measuring reference videos

```bash
python3 pipeline/tools/transcribe.py ref.mp4 ref.words.json
python3 pipeline/tools/measure.py ref.mp4 --words ref.words.json -o ref.metrics.json --sheet ref.cuts.png
python3 pipeline/tools/gemini_shots.py ref.mp4 ref.shots.json      # needs GEMINI_API_KEY
python3 pipeline/tools/compare.py out/001-tickle.metrics.json refs/*.metrics.json
```

Look at the `--sheet` contact sheet before trusting the cut numbers: the cut
detector is tuned for flat animation and was calibrated on one video. Set
`--caption-band` to the share of the frame height (from the bottom) that
captions occupy in that video.

## Setup

```bash
pip install -r pipeline/requirements.txt
python3 -m piper.download_voices en_US-ryan-high --download-dir pipeline/.models/piper
(cd pipeline/studio && npm install)
```

Needs ffmpeg and a Chrome/Chromium (`REMOTION_BROWSER=/path/to/chrome-headless-shell`
if Remotion can't download its own). The Inter font ships in
`studio/public/fonts` (SIL OFL), so renders don't need the network.

Remotion is free for individuals and companies of up to 3 people; larger
companies need a Remotion company license.
