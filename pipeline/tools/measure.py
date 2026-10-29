"""Measure a video's format: file spec, cut rhythm, loudness and speech pacing.

    python3 pipeline/tools/measure.py video.mp4 --words words.json -o metrics.json

The same script runs on reference videos and on our own renders, so the two
can be compared number for number (see compare.py). --words takes the output
of transcribe.py; without it the speech metrics are skipped.
"""
import argparse
import json
import re
import statistics
import subprocess

from common import write_json
from cuts import contact_sheet, detect_cuts

PAUSE = 0.3  # seconds of silence between words that counts as a pause


def spec(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), {})
    num, den = map(int, v["avg_frame_rate"].split("/"))
    return {
        "width": v["width"], "height": v["height"], "fps": round(num / den, 3),
        "duration": round(float(info["format"]["duration"]), 3),
        "video_codec": v["codec_name"], "audio_codec": a.get("codec_name"),
        "audio_rate": int(a["sample_rate"]) if a else None,
        "bitrate_kbps": round(int(info["format"]["bit_rate"]) / 1000),
    }


def cuts(path, duration, caption_band):
    times, _ = detect_cuts(path, caption_band)
    bounds = [0.0, *times, duration]
    lengths = [b - a for a, b in zip(bounds, bounds[1:])]
    return {
        "shots": len(lengths),
        "cuts_per_min": round(len(times) / duration * 60, 1),
        "avg_shot_s": round(statistics.mean(lengths), 2),
        "median_shot_s": round(statistics.median(lengths), 2),
        "caption_band": caption_band,
        "cut_times": times,
    }


def loudness(path):
    err = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-i", path, "-filter_complex",
                          "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    grab = lambda label: float(re.search(rf"{label}:\s+(-?[\d.]+|-inf)", summary).group(1))
    return {"integrated_lufs": grab("I"), "loudness_range_lu": grab("LRA"), "true_peak_dbfs": grab("Peak")}


def speech(words, duration):
    if not words:
        return None
    gaps = [b["start"] - a["end"] for a, b in zip(words, words[1:])]
    pauses = [g for g in gaps if g >= PAUSE]
    span = words[-1]["end"] - words[0]["start"]
    first_stop = next((w["end"] for w in words if re.search(r"[.?!]$", w["text"])), None)
    return {
        "words": len(words),
        "first_word_s": round(words[0]["start"], 2),
        "first_sentence_end_s": round(first_stop, 2) if first_stop else None,
        "wpm_while_speaking": round(len(words) / span * 60),
        "wpm_overall": round(len(words) / duration * 60),
        "pauses": len(pauses),
        "mean_pause_s": round(statistics.mean(pauses), 2) if pauses else 0,
        "longest_pause_s": round(max(gaps), 2) if gaps else 0,
        "speech_coverage": round(sum(w["end"] - w["start"] for w in words) / duration, 2),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--words")
    ap.add_argument("-o", "--output")
    ap.add_argument("--caption-band", type=float, default=0.3, help="fraction of height at the bottom to ignore for cuts")
    ap.add_argument("--sheet", help="contact sheet of detected cuts, for a human spot-check")
    args = ap.parse_args()

    s = spec(args.video)
    words = json.load(open(args.words))["words"] if args.words else []
    result = {"file": args.video, "spec": s, "cuts": cuts(args.video, s["duration"], args.caption_band),
              "loudness": loudness(args.video), "speech": speech(words, s["duration"])}
    if args.output:
        write_json(args.output, result)
    if args.sheet:
        contact_sheet(args.video, result["cuts"]["cut_times"], args.sheet)
    print(json.dumps({k: v for k, v in result.items() if k != "file"}, indent=2))


if __name__ == "__main__":
    main()
