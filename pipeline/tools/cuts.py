"""Hard-cut detection tuned for flat 2D animation.

PySceneDetect's stock detectors found 0 of 13 known cuts in our own render:
flat line art on one paper background barely moves their colour statistics.
Here a cut is a frame where a large share of pixels change at once, several
times more than in the frames around it. Pop-in animations spread their
change over several frames, so they do not spike. The caption band at the
bottom is ignored because captions change every half second.

Calibrated on episode 001 against its known cut times: 13/13 found, 1 false
positive. Check new material with --sheet before trusting the numbers.

    python3 pipeline/tools/cuts.py video.mp4 --sheet cuts.png
"""
import argparse
import json
import subprocess
import tempfile

import numpy as np

W, H = 135, 240


def fps_of(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True).stdout.split()[0]
    num, den = map(int, out.split("/"))
    return num / den


def frame_diffs(path, caption_band):
    """Share of pixels that change a lot between consecutive frames, streamed."""
    rows = int(H * (1 - caption_band))
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray",
                             "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    diffs, prev = [0.0], None
    while chunk := proc.stdout.read(W * H):
        if len(chunk) < W * H:
            break
        cur = np.frombuffer(chunk, np.uint8).reshape(H, W)[:rows].astype(np.int16)
        if prev is not None:
            diffs.append(float((np.abs(cur - prev) > 40).mean()))
        prev = cur
    proc.wait()
    return np.array(diffs)


def detect_cuts(path, caption_band=0.3, threshold=0.03, ratio=3.0):
    """Return (cut times in seconds, fps)."""
    d = frame_diffs(path, caption_band)
    fps = fps_of(path)
    cuts = []
    for i in range(1, len(d)):
        around = np.concatenate([d[max(1, i - 4):i], d[i + 1:i + 5]])
        if d[i] >= threshold and d[i] >= ratio * (np.median(around) + 1e-4):
            if not cuts or i - cuts[-1] > 4:
                cuts.append(i)
    return [round(i / fps, 3) for i in cuts], fps


def contact_sheet(path, times, out, cols=6):
    """One thumbnail just after each detected cut, for a human spot-check."""
    if not times:
        return
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t + 0.05:.3f}", "-i", path, "-frames:v", "1", "-vf",
                            f"scale=240:-2,drawtext=text='{t:.2f}s':x=6:y=6:fontsize=22:fontcolor=red",
                            f"{tmp}/{i:03d}.png"], check=True)
        rows = (len(times) + cols - 1) // cols
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/%03d.png", "-vf", f"tile={cols}x{rows}",
                        "-frames:v", "1", out], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--caption-band", type=float, default=0.3, help="fraction of height at the bottom to ignore")
    ap.add_argument("--sheet", help="write a contact sheet of the detected cuts here")
    args = ap.parse_args()
    times, fps = detect_cuts(args.video, args.caption_band)
    print(json.dumps({"fps": fps, "cuts": times}))
    if args.sheet:
        contact_sheet(args.video, times, args.sheet)


if __name__ == "__main__":
    main()
