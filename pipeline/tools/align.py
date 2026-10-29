"""Give every script word a start/end time from the voiceover.

Transcribes voice.wav, matches transcript words to script words, and takes
times from the matches. Script words the transcriber missed get times
interpolated between their matched neighbours. The script's spelling wins,
so captions always match the script exactly.

Writes words.json (for captions and animation) and transcript.json (the raw
transcript, used by wer.py).
"""
import argparse
from difflib import SequenceMatcher

from common import load_episode, norm_token, public_dir, write_json
from transcribe import transcribe


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()

    ep = load_episode(args.episode)
    out = public_dir(args.episode)
    heard, backend = transcribe(str(out / "voice.wav"), args.model)
    write_json(out / "transcript.json", {"backend": backend, "words": heard})

    script = [{"text": w, "line": i} for i, line in enumerate(ep["lines"]) for w in line["text"].split()]
    a = [norm_token(w["text"]) for w in script]
    b = [norm_token(w["text"]) for w in heard]
    times = [None] * len(script)
    for block in SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            h = heard[block.b + k]
            times[block.a + k] = (h["start"], h["end"])
    matched = sum(t is not None for t in times)

    # Fill gaps by spreading unmatched words evenly between known neighbours.
    i = 0
    while i < len(times):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        lo = times[i - 1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(times) else lo + 0.3 * (j - i)
        step = (hi - lo) / (j - i)
        for k in range(i, j):
            times[k] = (lo + step * (k - i), lo + step * (k - i + 1))
        i = j

    words =[{**w, "start": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(script, times)]
    write_json(out / "words.json", {"backend": backend, "words": words})
    print(f"{len(words)} script words aligned ({matched} timed) via {backend}")


if __name__ == "__main__":
    main()
