"""Two-pass loudness normalisation to YouTube's playback level.

    python3 pipeline/tools/post.py in.mp4 out.mp4

YouTube turns louder uploads down to about -14 LUFS, so mastering there
keeps the mix as intended. Video is copied untouched.
"""
import argparse
import json
import re
import subprocess

TARGET = {"I": -14.0, "TP": -1.0, "LRA": 11.0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    args = ap.parse_args()

    spec = f"loudnorm=I={TARGET['I']}:TP={TARGET['TP']}:LRA={TARGET['LRA']}"
    probe = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", args.input, "-af", f"{spec}:print_format=json",
                            "-f", "null", "-"], capture_output=True, text=True, check=True).stderr
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe).group(0))
    second = (f"{spec}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
              f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", args.input, "-af", second, "-ar", "48000",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", args.output], check=True)
    print(f"loudness {m['input_i']} LUFS -> {TARGET['I']} LUFS: {args.output}")


if __name__ == "__main__":
    main()
