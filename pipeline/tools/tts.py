"""Synthesize an episode's voiceover one line at a time.

Writes voice.wav and timeline.json (start/end of every line, in seconds) to
studio/public/episodes/<id>/ so the composition can cut on line boundaries.

Backend: Piper (local, free). It is a stand-in for a paid voice such as
ElevenLabs; swap the synth() function when a key is available.
"""
import argparse
import io
import os
import shutil
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

from common import EPISODES, PIPELINE, load_episode, public_dir, write_json


def synth(voice, text, length_scale):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=length_scale))
    buf.seek(0)
    with wave.open(buf, "rb") as wf:
        return wf.getparams(), wf.readframes(wf.getnframes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voices-dir", default=os.environ.get("PIPER_VOICES_DIR", str(PIPELINE / ".models" / "piper")))
    args = ap.parse_args()

    ep = load_episode(args.episode)
    voice = PiperVoice.load(str(Path(args.voices_dir) / f"{ep['voice']['model']}.onnx"))
    out = public_dir(args.episode)

    params, chunks, timeline, cursor = None, [], [], 0.0
    prev_beat = None
    for i, line in enumerate(ep["lines"]):
        if prev_beat is not None:
            gap = ep["beat_gap_seconds"] if line["beat"] != prev_beat else ep["gap_seconds"]
            chunks.append(("silence", gap))
            cursor += gap
        params, frames = synth(voice, line["text"], ep["voice"]["length_scale"])
        dur = len(frames) / (params.sampwidth * params.nchannels * params.framerate)
        chunks.append(("audio", frames))
        timeline.append({"index": i, "beat": line["beat"], "scene": line["scene"],
                         "text": line["text"], "start": round(cursor, 3), "end": round(cursor + dur, 3)})
        cursor += dur
        prev_beat = line["beat"]

    chunks.append(("silence", ep["tail_seconds"]))
    with wave.open(str(out / "voice.wav"), "wb") as wf:
        wf.setparams(params)
        for kind, payload in chunks:
            if kind == "silence":
                n = int(payload * params.framerate) * params.sampwidth * params.nchannels
                wf.writeframes(b"\x00" * n)
            else:
                wf.writeframes(payload)

    total = cursor + ep["tail_seconds"]
    write_json(out / "timeline.json", {"duration": round(total, 3), "lines": timeline})
    shutil.copy(EPISODES / args.episode / "episode.json", out / "episode.json")
    print(f"voice.wav {total:.2f}s, {len(timeline)} lines -> {out}")


if __name__ == "__main__":
    main()
