"""Synthesize the channel's small sound-effect kit from scratch.

Everything is generated, so there is nothing to license. Writes WAVs to
studio/public/sfx/.
"""
import wave

import numpy as np

from common import PUBLIC

RATE = 44100


def env(n, attack=0.005, decay=0.15):
    t = np.arange(n) / RATE
    return np.minimum(t / attack, 1.0) * np.exp(-t / decay)


def tone(freq_start, freq_end, dur, decay, shape=np.sin):
    n = int(dur * RATE)
    freq = np.geomspace(freq_start, freq_end, n)
    phase = 2 * np.pi * np.cumsum(freq) / RATE
    return shape(phase) * env(n, decay=decay)


def noise_sweep(dur, lo, hi, rng):
    """Band-passed noise whose centre sweeps lo->hi: a whoosh."""
    n = int(dur * RATE)
    spec = np.fft.rfft(rng.standard_normal(n))
    freqs = np.fft.rfftfreq(n, 1 / RATE)
    centre = np.sqrt(lo * hi)
    spec *= np.exp(-((np.log(freqs + 1) - np.log(centre)) ** 2) / 0.8)
    out = np.fft.irfft(spec, n)
    t = np.linspace(0, 1, n)
    return out * np.sin(np.pi * t) ** 2


def save(name, x, gain=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    d = PUBLIC / "sfx"
    d.mkdir(parents=True, exist_ok=True)
    with wave.open(str(d / f"{name}.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes((x * 32767).astype(np.int16).tobytes())


def main():
    rng = np.random.default_rng(7)
    save("pop", tone(900, 300, 0.12, 0.04))
    save("whoosh", noise_sweep(0.35, 300, 3000, rng), gain=0.5)
    save("tick", tone(2500, 2400, 0.04, 0.008), gain=0.6)
    save("boop", tone(220, 180, 0.25, 0.1, shape=lambda p: np.sign(np.sin(p)) * 0.5), gain=0.4)
    ding = sum(tone(f, f, 0.9, 0.3) * a for f, a in [(1320, 1), (1980, 0.4), (2640, 0.2)])
    save("ding", ding, gain=0.5)
    down = tone(600, 150, 0.5, 0.3)
    save("slidedown", down, gain=0.5)
    giggle = np.concatenate([tone(f, f * 0.8, 0.07, 0.03) for f in (700, 820, 760, 900, 840)])
    save("giggle", giggle, gain=0.5)
    print("sfx ->", PUBLIC / "sfx")


if __name__ == "__main__":
    main()
