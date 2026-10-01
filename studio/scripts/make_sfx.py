#!/usr/bin/env python3
"""Synthesize basic transition SFX (whoosh, impact) into media/sfx/ - no external assets needed."""
import numpy as np
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)


def whoosh(dur=0.5, peak=0.62):
    n = int(SR * dur)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    # time-varying one-pole lowpass: cutoff sweeps up then down around the peak
    cutoff = 300 + 5200 * np.exp(-((t - peak) ** 2) / 0.03)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros(n)
    for i in range(1, n):
        y[i] = (1 - a[i]) * noise[i] + a[i] * y[i - 1]
    env = np.where(t < peak, (t / peak) ** 2.5, np.exp(-(t - peak) * 9))
    y = y * env
    pan = np.clip(t * 1.4 - 0.2, 0, 1)  # left -> right sweep
    st = np.stack([y * (1 - pan * 0.7), y * (0.3 + pan * 0.7)], axis=1)
    return st / np.abs(st).max() * 0.9


def impact(dur=1.2):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 55 + 70 * np.exp(-t * 18)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    click = rng.standard_normal(n) * np.exp(-t * 60) * 0.5
    y = boom + click
    st = np.stack([y, y], axis=1)
    return st / np.abs(st).max() * 0.9


for name, sig in {"whoosh": whoosh(), "impact": impact()}.items():
    wavfile.write(f"media/sfx/{name}.wav", SR, (sig * 32767).astype(np.int16))
    print("wrote", name)
