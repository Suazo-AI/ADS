"""Word-level transcription of any audio or video file.

Uses AssemblyAI when ASSEMBLYAI_API_KEY is set, otherwise local
faster-whisper. Output is a JSON list of {"text", "start", "end"} in seconds.

    python3 pipeline/tools/transcribe.py input.mp4 words.json
"""
import argparse
import json
import os
import subprocess
import time

import requests

from common import write_json

AAI = "https://api.assemblyai.com/v2"


def assemblyai(path, key):
    headers = {"authorization": key}
    with open(path, "rb") as f:
        upload = requests.post(f"{AAI}/upload", headers=headers, data=f, timeout=600).json()
    job = requests.post(f"{AAI}/transcript", headers=headers, timeout=60,
                        json={"audio_url": upload["upload_url"], "punctuate": True, "format_text": True}).json()
    while True:
        r = requests.get(f"{AAI}/transcript/{job['id']}", headers=headers, timeout=60).json()
        if r["status"] == "completed":
            return [{"text": w["text"], "start": w["start"] / 1000, "end": w["end"] / 1000} for w in r["words"]]
        if r["status"] == "error":
            raise RuntimeError(r["error"])
        time.sleep(3)


def load_audio(path, rate=16000):
    """Decode any audio/video file to mono float32 with ffmpeg."""
    import numpy as np

    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-f", "s16le",
                          "-ac", "1", "-ar", str(rate), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def whisper(path, model_size):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    # Pass decoded samples rather than a path: faster-whisper's own decoder
    # (PyAV) breaks across PyAV releases.
    segments, _ = model.transcribe(load_audio(path), word_timestamps=True, beam_size=5, vad_filter=False)
    return [{"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
            for seg in segments for w in seg.words]


def transcribe(path, model_size="small.en"):
    key = os.environ.get("ASSEMBLYAI_API_KEY")
    words = assemblyai(path, key) if key else whisper(path, model_size)
    return words, ("assemblyai" if key else f"faster-whisper:{model_size}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()
    words, backend = transcribe(args.input, args.model)
    write_json(args.output, {"backend": backend, "words": words})
    print(f"{len(words)} words via {backend} -> {args.output}")


if __name__ == "__main__":
    main()
