"""Word error rate between an episode's script and a transcript of the render.

    python3 pipeline/tools/wer.py 001-tickle out/001-tickle.heard.json

Proves the voice actually says the script (and that captions, which use the
script's words, match what viewers hear). Lists every disagreement.
"""
import argparse
import json
from difflib import SequenceMatcher

from common import load_episode, norm_token


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("transcript")
    args = ap.parse_args()

    script = [norm_token(w) for line in load_episode(args.episode)["lines"] for w in line["text"].split()]
    heard = [norm_token(w["text"]) for w in json.load(open(args.transcript))["words"]]
    script, heard = [w for w in script if w], [w for w in heard if w]

    # Levenshtein distance over words.
    prev = list(range(len(heard) + 1))
    for i, s in enumerate(script, 1):
        cur = [i]
        for j, h in enumerate(heard, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s != h)))
        prev = cur
    wer = prev[-1] / len(script)

    print(f"WER {wer:.1%} ({prev[-1]} errors / {len(script)} script words)")
    for tag, i1, i2, j1, j2 in SequenceMatcher(a=script, b=heard, autojunk=False).get_opcodes():
        if tag != "equal":
            print(f"  {tag:8} script: {' '.join(script[i1:i2]) or '-':30} heard: {' '.join(heard[j1:j2]) or '-'}")


if __name__ == "__main__":
    main()
