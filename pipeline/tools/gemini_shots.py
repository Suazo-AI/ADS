"""Describe every shot of a video with Gemini, as countable data.

    GEMINI_API_KEY=... python3 pipeline/tools/gemini_shots.py video.mp4 shots.json

Splits the video at its cuts (cuts.py, tuned for flat animation), sends each shot as its own clip
so fast cutting is not lost to Gemini's default 1 frame/second sampling, and
asks for a fixed JSON schema per shot.

Not yet run: needs GEMINI_API_KEY. Override the model with GEMINI_MODEL.
"""
import argparse
import base64
import json
import os
import subprocess
import tempfile

import requests

from common import write_json
from cuts import detect_cuts

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "characters": {"type": "INTEGER", "description": "Number of characters on screen"},
        "character_style": {"type": "STRING", "description": "e.g. stick figure, flat 2D, chibi"},
        "action": {"type": "STRING", "description": "What happens, one sentence"},
        "on_screen_text": {"type": "ARRAY", "items": {"type": "STRING"}},
        "background": {"type": "STRING", "description": "plain colour, simple scene, detailed scene"},
        "camera": {"type": "STRING", "enum": ["static", "zoom in", "zoom out", "pan", "shake", "cut-in"]},
        "props": {"type": "ARRAY", "items": {"type": "STRING"}},
        "emotion": {"type": "STRING"},
        "purpose": {"type": "STRING", "enum": ["hook", "setup", "explanation", "example", "joke", "payoff", "call to action"]},
    },
    "required": ["characters", "action", "on_screen_text", "background", "camera", "purpose"],
}
PROMPT = ("This is one shot from a short animated video. Describe only what is visible in this shot. "
          "Count characters exactly; transcribe on-screen text exactly.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("output")
    ap.add_argument("--fps", type=int, default=5, help="frames per second Gemini samples from each clip")
    args = ap.parse_args()

    key = os.environ["GEMINI_API_KEY"]
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    times, _ = detect_cuts(args.video)
    duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.video],
                                    capture_output=True, text=True, check=True).stdout)
    bounds = [0.0, *times, duration]
    shots = list(zip(bounds, bounds[1:]))
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, (start, end) in enumerate(shots):
            clip = f"{tmp}/shot{i}.mp4"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end),
                            "-i", args.video, "-an", "-c:v", "libx264", "-preset", "veryfast", clip], check=True)
            body = {
                "contents": [{"parts": [
                    {"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(open(clip, "rb").read()).decode()},
                     "video_metadata": {"fps": args.fps}},
                    {"text": PROMPT},
                ]}],
                "generationConfig": {"responseMimeType": "application/json", "responseSchema": SCHEMA},
            }
            r = requests.post(API.format(model=model), params={"key": key}, json=body, timeout=300)
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            results.append({"shot": i, "start": start, "end": end, **json.loads(text)})
            print(f"shot {i}: {results[-1]['action']}")
    write_json(args.output, {"model": model, "shots": results})


if __name__ == "__main__":
    main()
