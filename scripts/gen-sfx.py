#!/usr/bin/env python3
"""CR-20: synthesize answer SFX - no external asset downloads needed.

Writes public/sfx/correct.mp3 (ascending arpeggio chime) and
public/sfx/wrong.mp3 (gentle descending two-tone). Pure-Python WAV
synthesis piped through ffmpeg for mp3 encoding.
"""
import math
import os
import struct
import subprocess
import wave

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sfx")


def sine(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def note(freq: float, start: float, dur: float, vol: float = 1.0):
    """One soft tone: fundamental + a touch of 2nd harmonic, ADSR-lite."""
    def f(t: float) -> float:
        x = t - start
        if x < 0 or x > dur:
            return 0.0
        attack = min(1.0, x / 0.02)
        release = min(1.0, (dur - x) / 0.15)
        env = attack * release * math.exp(-1.8 * x)
        return vol * env * (0.85 * sine(freq, x) + 0.15 * sine(freq * 2, x))
    return f


def render(path: str, dur: float, layers) -> None:
    n = int(SR * dur)
    frames = bytearray()
    for i in range(n):
        t = i / SR
        s = sum(f(t) for f in layers)
        s = max(-1.0, min(1.0, s * 0.5))
        frames += struct.pack("<h", int(s * 32767))
    wav_path = path + ".wav"
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
         "-codec:a", "libmp3lame", "-q:a", "4", path],
        check=True,
    )
    os.remove(wav_path)
    print("wrote", path)


os.makedirs(OUT, exist_ok=True)

# correct.mp3 - ascending C5-E5-G5-C6 arpeggio, last note rings longer
render(
    os.path.join(OUT, "correct.mp3"),
    0.75,
    [
        note(523.25, 0.00, 0.35),   # C5
        note(659.25, 0.09, 0.35),   # E5
        note(783.99, 0.18, 0.35),   # G5
        note(1046.50, 0.27, 0.48),  # C6 rings out
    ],
)

# wrong.mp3 - soft descending E4 -> C4, no harsh buzzer
render(
    os.path.join(OUT, "wrong.mp3"),
    0.55,
    [
        note(329.63, 0.00, 0.28, 0.8),  # E4
        note(261.63, 0.16, 0.36, 0.8),  # C4, lower and slower
    ],
)
