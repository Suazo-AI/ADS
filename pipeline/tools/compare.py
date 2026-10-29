"""Table our render's metrics against the range measured on reference videos.

    python3 pipeline/tools/compare.py out/001-tickle.metrics.json refs/*.metrics.json

A metric passes when the pilot falls inside the references' middle half
(25th-75th percentile), widened to min-max when there are fewer than four
references.
"""
import argparse
import json
import statistics

METRICS = [
    ("cuts", "cuts_per_min"), ("cuts", "avg_shot_s"), ("cuts", "median_shot_s"),
    ("speech", "wpm_while_speaking"), ("speech", "first_word_s"), ("speech", "first_sentence_end_s"),
    ("speech", "mean_pause_s"), ("speech", "speech_coverage"), ("spec", "duration"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pilot")
    ap.add_argument("refs", nargs="+")
    args = ap.parse_args()

    pilot = json.load(open(args.pilot))
    refs = [json.load(open(r)) for r in args.refs]
    print(f"| metric | pilot | reference median | reference range | pass |\n|---|---|---|---|---|")
    for group, key in METRICS:
        vals = sorted(r[group][key] for r in refs if r.get(group) and r[group].get(key) is not None)
        mine = (pilot.get(group) or {}).get(key)
        if not vals or mine is None:
            continue
        if len(vals) >= 4:
            q = statistics.quantiles(vals, n=4)
            lo, hi = q[0], q[2]
        else:
            lo, hi = vals[0], vals[-1]
        ok = lo <= mine <= hi
        print(f"| {key} | {mine} | {statistics.median(vals):g} | {lo:g}–{hi:g} | {'yes' if ok else 'NO'} |")


if __name__ == "__main__":
    main()
