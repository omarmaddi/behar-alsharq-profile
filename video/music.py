"""Original score + sound design for the Bahar Al-Sharq ad, synthesised from scratch
and timed to the video's cuts (scene boundaries come from audio/words.json, exactly
as index.html computes them). Output: audio/music.wav and audio/sfx.wav (48 kHz stereo).
"""
import json
import numpy as np
from scipy import signal

SR = 48000
OFF = 0.40
W = json.load(open("audio/words.json"))
ws = lambda i: W[i][0] + OFF
DUR = round(W[-1][1] + OFF + 2.7, 2)
SB = [0, ws(7) + 0.25, ws(16) + 0.28, ws(29) + 0.12, ws(36) + 0.05, ws(42) + 0.09, ws(52) + 0.03, ws(64) - 0.04, DUR]
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def t_(d): return np.arange(int(d * SR)) / SR
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, x, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414
    buf[i:i + len(x), 1] += x * gain * r * 1.414


def adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    env = np.ones(n) * s
    env[:a] = np.linspace(0, 1, a, endpoint=False) if a else env[:a]
    env[a:a + d] = np.linspace(1, s, len(env[a:a + d]))
    if r: env[-r:] *= np.linspace(1, 0, len(env[-r:]))
    return env


def lp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)
def hp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


# ------------------------------------------------------------------ harmony
BPM = 108
BEAT = 60 / BPM
BAR = 4 * BEAT
# D – A – Bm – G  (I–V–vi–IV), uplifting and familiar
CHORDS = [[62, 66, 69], [61, 64, 69], [59, 62, 66], [59, 62, 67]]
ROOTS = [38, 33, 35, 31]
def chord_at(t): return int(t // (2 * BAR)) % 4


# ------------------------------------------------------------------ instruments
def pad(freqs, dur):
    tt = t_(dur); x = np.zeros_like(tt)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):                     # detuned saws, softened
            ff = f * 2 ** (det / 12)
            x += signal.sawtooth(2 * np.pi * ff * tt + rng.uniform(0, 6)) * 0.33
    x = lp(x, 1400)
    return x * adsr(len(tt), 0.9, 0.5, 0.8, 1.2) * 0.10


def pluck(f, dur=0.6):
    tt = t_(dur)
    x = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt))
    return x * np.exp(-tt * 7.5) * 0.12


def bass(f, dur):
    tt = t_(dur)
    x = np.tanh(1.6 * np.sin(2 * np.pi * f * tt)) + 0.3 * np.sin(np.pi * f * tt)
    return lp(x, 380) * adsr(len(tt), 0.01, 0.1, 0.7, 0.08) * 0.20


def kick():
    tt = t_(0.35); f = 45 + 110 * np.exp(-tt * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.40


def clap():
    tt = t_(0.25)
    x = bp(rng.standard_normal(len(tt)), 900, 3200)
    return x * np.exp(-tt * 22) * 0.16


def hat(open_=False):
    tt = t_(0.12 if not open_ else 0.28)
    return hp(rng.standard_normal(len(tt)), 7000) * np.exp(-tt * (45 if not open_ else 14)) * 0.045


# ------------------------------------------------------------------ arrangement
B0, C0, H0 = SB[1], SB[2], SB[7]

# pads: whole piece, two bars per chord
t = 0.0
while t < DUR:
    c = chord_at(t)
    add(music, pad([midi(n) for n in CHORDS[c]] + [midi(CHORDS[c][0] - 12)], 2 * BAR + 1.2), t, 0)
    t += 2 * BAR

# shimmer intro (sparse high plucks) until the logo
t = 0.3
while t < B0 - 0.3:
    n = CHORDS[chord_at(t)][int(t / BEAT) % 3] + 24
    add(music, pluck(midi(n), 1.2) * 0.9, t, rng.uniform(-.6, .6)); t += BEAT

# arpeggio + bass from the logo on; drums from the first service on
step = BEAT / 2
t = B0
k = 0
while t < H0 + 2 * BAR:
    c = chord_at(t); notes = CHORDS[c]
    patt = [0, 1, 2, 1, 2, 0, 1, 2]
    n = notes[patt[k % 8]] + 12
    fade = 1.0 if t < H0 else max(0.0, 1 - (t - H0) / (2 * BAR))
    add(music, pluck(midi(n)), t, (-.35 if k % 2 else .35), 0.9 * fade)
    if k % 2 == 0 and t < H0:
        add(music, bass(midi(ROOTS[c]), step * 1.8), t, 0)
    if C0 <= t < H0:
        beat_in_bar = k % 8
        if beat_in_bar in (0, 4): add(music, kick(), t)
        if beat_in_bar in (2, 6): add(music, clap(), t, 0.1)
        add(music, hat(open_=(beat_in_bar == 7)), t, -0.3 if k % 2 else 0.3)
    t += step; k += 1

# closing chord under the call to action
add(music, pad([midi(62), midi(66), midi(69), midi(74), midi(50)], DUR - H0 + 0.5) * 2.6, H0, 0)
t = H0 + 2 * BAR
while t < DUR - 0.8:
    add(music, pluck(midi([74, 78, 81, 78][int((t - H0) / BEAT) % 4]), 1.4) * 0.8, t, rng.uniform(-.5, .5)); t += BEAT
add(music, pluck(midi(74), 2.5) * 1.2, H0 + 0.05, 0)

# ------------------------------------------------------------------ sound design
def whoosh(d=0.9):
    tt = t_(d); n = rng.standard_normal(len(tt)); out = np.zeros_like(n)
    seg = 480
    for i in range(0, len(n), seg):                      # sweeping band-pass
        p = i / len(n); fc = 300 + 5200 * np.sin(np.pi * p) ** 2
        out[i:i + seg] = bp(n[i:i + seg], max(80, fc * 0.6), min(SR / 2 - 100, fc * 1.4))
    env = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    return out * env * 0.22


def riser(d):
    tt = t_(d); f = 200 * 2 ** (tt / d * 3)
    x = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * hp(rng.standard_normal(len(tt)), 2000)
    return x * (tt / d) ** 2 * 0.10


def impact():
    tt = t_(1.6); f = 38 + 60 * np.exp(-tt * 6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
    x += lp(rng.standard_normal(len(tt)), 1200) * np.exp(-tt * 9) * 0.3
    return x * 0.34


def pop(f=900):
    tt = t_(0.14)
    return np.sin(2 * np.pi * (f + 600 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 30) * 0.10


for b in SB[1:8]:                                        # every scene wipe
    add(sfx, whoosh(), b - 0.45, rng.uniform(-.3, .3))
add(sfx, riser(1.6), B0 - 1.6)
add(sfx, impact(), B0 + 0.05)
add(sfx, impact() * 0.8, H0 + 0.05)
for i in (37, 38, 39, 42, 45, 46, 56, 58, 60, 61, 62, 63):   # items / services popping in
    add(sfx, pop(700 + 40 * (i % 7)), ws(i) - 0.02, rng.uniform(-.5, .5))
add(sfx, pop(1200) * 1.3, ws(70) + 0.2)                  # CTA button

# ------------------------------------------------------------------ reverb + output
def reverb(x, secs=1.8, mix=0.22):
    tt = t_(secs); ir = rng.standard_normal((len(tt), 2)) * np.exp(-tt * 4)[:, None]
    ir = np.stack([lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)], 1)
    wet = np.stack([signal.fftconvolve(x[:, i], ir[:, i])[: len(x)] for i in range(2)], 1)
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return x * (1 - mix) + wet * mix


music = reverb(music, 2.2, 0.28)
sfx = reverb(sfx, 1.2, 0.15)
end = int(DUR * SR)
fade = np.ones(end); fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
for name, x in (("music", music), ("sfx", sfx)):
    x = x[:end] * fade[:, None]
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    from scipy.io import wavfile
    wavfile.write(f"audio/{name}.wav", SR, (x * 32767).astype(np.int16))
print("duration", DUR, "scenes", [round(s, 2) for s in SB])
