# Feasibility test: faceless stickman channel

**Status: half done.** The production side is proven. The reference analysis
is blocked: Facebook requires login for the reference profile, and no API
keys are set yet.

## Verdict so far

**Go on "can we make these videos".** A 33-second vertical stickman video
was scripted, voiced, animated, captioned, given sound effects, mastered and
checked by machine, all from one command in 82 seconds of compute time.

**No verdict yet on "can we compete".** That depends on measuring the
reference format and on real viewers, and neither has happened.

## Pilot 001 checks (done by tools, not by eye)

| Check | Result | Pass? |
|---|---|---|
| File spec (ffprobe) | 1080×1920, 30 fps, H.264 + AAC 48 kHz, 33.5 s | yes |
| Loudness (EBU R128) | -14.0 LUFS integrated, -1.0 dBTP peak | yes, YouTube's playback level |
| Voice says the script (re-transcribed render) | WER 0.9%: 1 of 110 words ("a" heard as "the") | yes. An earlier run had 2 errors ("Go on" heard as "No", "add" as "at"); Piper's output varies run to run |
| Cut rhythm | 14 cuts detected (13 real + 1 stamp slam), 25 cuts/min, median shot 2.0 s | no reference to compare yet |
| Speech pace | 206 wpm while speaking, first sentence done at 1.0 s, longest pause 0.56 s | no reference to compare yet |
| Machine time | voice 6.6 s, align 12.3 s, render 40.7 s, master 5.9 s, verify 16 s | |
| API cost | $0 (every service has a local stand-in) | |

**A measurement finding:** PySceneDetect's stock settings found **0 of 13**
known cuts in flat animation. `tools/cuts.py` finds 13/13 with 1 false
positive, but it was calibrated on our own render only, so check it on the
reference using its contact sheet.

## What was weak

1. **Voice.** Piper is a free local placeholder and sounds synthetic. A real
   channel needs an ElevenLabs-class voice or a human narrator.
2. **Motion.** Pose-to-pose animation with procedural wiggle. There are no
   walk cycles, no lip sync and no music bed.
3. **Character.** A plain stickman is generic. A signature design (colour,
   accessory) is needed for brand and for YouTube's inauthentic-content
   policy.
4. **Per-episode authoring is the real cost.** The 13 scenes were hand-coded.
   Rendering is trivial by comparison.
5. **Facts.** The script cites a real study (Blakemore, Wolpert & Frith) from
   memory. Episodes need a sourcing step.

## What episodes #2 and #20 would take

- **#2:** reuses the rig, props, captions, sound effects and the whole
  pipeline. It needs a new script and new scenes.
- **#20:** needs a library of scene templates driven by `episode.json`
  (labelled prop, two-character beat, diagram reveal, meter, split
  comparison), so most episodes need no new code. It also needs a
  fact-check step and a fixed, licensed voice.

## Blocked and needed

1. **The reference.** Any one of these unblocks it:
   - direct links to 3–5 of the creator's individual videos
   - the creator's YouTube channel, if they cross-post
   - the files themselves
2. **Keys** (environment variables): `GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`,
   `ELEVENLABS_API_KEY`.

## Not done yet

- **Blind comparison kit.** It needs a reference clip.
- **Format comparison table.** `tools/compare.py` is ready but needs
  reference metrics.
- **Gemini per-shot analysis.** `tools/gemini_shots.py` is written but
  hasn't been run without a key.

## Checks only YouTube can do

- **Private upload:** the Copyright and Ad-suitability checks at upload.
  Pass = no claims and no limited-ads flag.
- **After publishing (Shorts):** "Viewed vs. swiped away" and average
  percentage viewed.
- **After publishing (long-form):** impressions click-through rate (CTR),
  retention at 0:30, and Test & Compare for thumbnails.
- **Starting targets (my own, not YouTube benchmarks):**
  - Shorts: at least 70% viewed rather than swiped away, and at least 80%
    average viewed.
  - Long-form: CTR inside the 2–10% band YouTube describes as typical.
  - Revise these after the first five uploads.
