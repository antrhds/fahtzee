# Builds src/splash-audio.js: the splash soundtrack, synthesised here from
# nothing (no samples, no licences), then trimmed to start at the tap.
#   pip install numpy  &&  python3 tools/splash-score.py
# Needs ffmpeg with libmp3lame (set FFMPEG to its path if it is not on PATH).
# The splash animation is at 120 BPM: the burst lands at 2.0s, the Fahtzee at
# 2.8s. The player's tap happens at TAP_AT, so the clip starts there.
import os, subprocess, base64
TAP_AT = 1.45
# Fahtzee sting soundtrack — 120 BPM, 15s, synthesised from nothing.
import numpy as np, wave
SR = 48000; DUR = 6.4; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rs = np.random.default_rng(3)

def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR); sig = sig[:max(0, N - i)] * gain
    if len(sig) == 0: return
    L[i:i+len(sig)] += sig * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:i+len(sig)] += sig * np.sqrt(0.5 * (1 + pan)) * 1.414

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.002, rel=None, k=None):
    x = tt(d); e = np.minimum(1, x / a) if a > 0 else np.ones_like(x)
    return e * (np.exp(-x * k) if k else np.clip(1 - x / d, 0, 1))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def lp(x, a):  # one pole
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def lpf(x, fc):  # fast FFT brickwall-ish lowpass with soft knee
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def hpf(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (f / fc) ** 4 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def bpf(x, fc, q=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= np.exp(-((np.log2(np.maximum(f, 1) / fc)) * q) ** 2); return np.fft.irfft(X, len(x))
noise = lambda d: rs.standard_normal(int(d * SR))

# ---------- instruments ----------
def kick(big=1.0):
    d = 0.5 if big < 1.5 else 1.1; x = tt(d)
    f = 45 + 140 * np.exp(-x * 28) * big ** 0.3
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-x * (7 / big)) + 0.5 * np.tanh(3 * np.sin(ph)) * np.exp(-x * 18)
    click = hpf(noise(0.01), 3000) * env(0.01) * 0.3
    s[:len(click)] += click
    return np.tanh(s * 1.4)
def hat(open_=False):
    d = 0.25 if open_ else 0.05
    return hpf(noise(d), 7000) * env(d, 0.001, k=14 if open_ else 70) * 0.35
def clap():
    s = bpf(noise(0.3), 1500, 1.5)
    e = np.zeros(len(s)); x = tt(0.3)
    for o in (0, 0.011, 0.022): e += np.where(x >= o, np.exp(-(x - o) * 90), 0)
    e += 0.6 * np.exp(-x * 14) * (x > 0.03)
    return s * e * 0.8
def crash(d=2.2):
    s = hpf(noise(d), 4500) + 0.5 * bpf(noise(d), 8000, 2)
    return s * env(d, 0.001, k=2.2) * 0.35
def sub_drop(d=1.4):
    x = tt(d); f = 70 * np.exp(-x * 1.6) + 28
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2) * 0.9
def saw(f, d, det=(-0.12, 0, 0.11)):
    x = tt(d); s = 0
    for dt in det:
        ff = f * 2 ** (dt / 12); ph = (x * ff + rs.random()) % 1
        s = s + (2 * ph - 1)
    return s / len(det)
def chord(notes, d, cutoff=2400, a=0.01, k=3.0, g=0.18):
    s = sum(saw(hz(n), d) for n in notes)
    return lpf(s, cutoff) * env(d, a, k=k) * g
def pad(notes, d, cutoff=900, g=0.12):
    s = sum(saw(hz(n), d, (-0.08, 0.07)) for n in notes)
    x = tt(d); e = np.minimum(1, x / (d * 0.5)) * np.minimum(1, (d - x) / 0.3)
    return lpf(s, cutoff) * e * g
def bass(n, d=0.24):
    x = tt(d); f = hz(n); s = np.tanh(2.2 * (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)))
    return lpf(s, 700) * env(d, 0.004, k=6) * 0.42
def bell(n, d=1.2, g=0.22):
    x = tt(d); f = hz(n)
    s = np.sin(2 * np.pi * f * x + 2.2 * np.exp(-x * 4) * np.sin(2 * np.pi * f * 3.5 * x))
    return s * env(d, 0.001, k=3.5) * g
def blip(n, d=0.35, g=0.35):
    x = tt(d); f = hz(n) * (1 + 0.6 * np.exp(-x * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.001, k=11) * g
def click(fc, g=0.3):
    d = 0.05; s = bpf(noise(d), fc, 3) + 0.5 * np.sin(2 * np.pi * fc * 0.6 * tt(d))
    return s * env(d, 0.0005, k=110) * g
def clatter(t0, n, spread, g=0.4):
    for _ in range(n):
        put(click(rs.uniform(1500, 4200), g * rs.uniform(0.4, 1)), t0 + rs.uniform(0, spread), rs.uniform(-0.6, 0.6))
def whoosh(d, f0, f1, g=0.35, rev=False):
    s = noise(d); x = tt(d); out = np.zeros_like(s); seg = 2048
    for i in range(0, len(s), seg):
        p = i / len(s); fc = f0 * (f1 / f0) ** p
        out[i:i+seg] = bpf(s[i:i+seg].copy() if len(s[i:i+seg]) == seg else np.pad(s[i:i+seg], (0, seg - len(s[i:i+seg]))), fc, 1.6)[:len(s[i:i+seg])]
    e = np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2 if not rev else (x / d) ** 3
    return out * e * g
def riser(d, f0, f1, g=0.15):
    x = tt(d); f = f0 * (f1 / f0) ** (x / d)
    s = saw(1, d, (0,)) * 0  # placeholder shape
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) + (2 * ((ph * 1.007) % 1) - 1)
    return lpf(s, 3000) * (x / d) ** 2 * g
def snare():
    x = tt(0.22); s = bpf(noise(0.22), 2500, 1) * np.exp(-x * 22) + 0.6 * np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30)
    return s * 0.45


F, C_, Bb, Dm = 53, 48, 46, 50
put(blip(84), 0.05, 0); put(blip(88), 0.5, -0.4); put(blip(88, g=0.28), 0.52, 0.4)
put(blip(91), 1.0, 0.4); put(blip(91, g=0.28), 1.02, -0.4)
put(pad([F, F+4, F+7, F+11], 2.1, 700, 0.10), 0.0)
put(whoosh(0.35, 800, 3000, 0.18), 1.12)
put(riser(0.55, 90, 700, 0.14), 1.45); put(whoosh(0.55, 400, 6000, 0.25, rev=True), 1.45)
put(kick(2), 2.0, 0, 1.0); put(crash(1.4), 2.0, 0.2, 0.7); put(sub_drop(0.9), 2.0, 0, 0.6)
put(chord([F, F+7, F+12, F+16, F+19], 0.7, 3200, k=4), 2.0)
put(kick(), 2.5, 0, 0.7); put(hat(), 2.25, 0.3); put(hat(), 2.75, -0.3)
clatter(2.58, 9, 0.12, 0.45); clatter(2.7, 4, 0.05, 0.25)
put(whoosh(0.3, 600, 6000, 0.3, rev=True), 2.5)
put(kick(2), 2.8, 0, 1.1); put(sub_drop(1.6), 2.8, 0, 1.0); put(crash(2.2), 2.8, -0.3); put(crash(2.2), 2.81, 0.3)
put(chord([F-12, F, F+4, F+7, F+12, F+16, F+19], 2.0, 3800, k=1.3, g=0.16), 2.8)
for i in range(18): put(bell(rs.choice([96, 100, 103, 108, 105]), 0.5, 0.05), 2.85 + i * 0.06 + rs.uniform(0, 0.03), rs.uniform(-.8, .8))
for i, n in enumerate([77, 81, 84, 89, 84, 81, 77]): put(blip(n, 0.2, 0.12), 2.85 + i * 0.055, (i - 3) / 4)
put(kick(), 3.3, 0, 0.6); put(clap(), 3.3, 0, 0.5); put(kick(), 3.8, 0, 0.6)
for i, n in enumerate([84, 88, 91, 96]): put(bell(n, 1.2, 0.09), 3.55 + i * 0.05, (i - 1.5) / 2)
put(blip(89, 0.4, 0.16), 3.9, 0)
# ---------- master: reverb, glue, limiter ----------
def reverb(x):
    out = np.zeros_like(x)
    for dl, fb in ((1557, .80), (1617, .79), (1491, .81), (1422, .82), (1277, .83), (1356, .80)):
        d = int(dl * SR / 44100); y = np.zeros_like(x); buf = x.copy()
        # comb via block recursion
        for i in range(d, len(x), d):
            buf[i:i+d] += fb * buf[i-d:i][:len(buf[i:i+d])]
        out += buf
    return lpf(out, 5000) / 6
wetL, wetR = reverb(L), reverb(np.roll(R, 97))
L2 = L + 0.22 * wetL; R2 = R + 0.22 * wetR
# fade the tail inside the 15s mark
fade = np.ones(N); fs = int(5.0 * SR); fe = int(5.8 * SR)
fade[fs:fe] = np.linspace(1, 0, fe - fs) ** 2; fade[fe:] = 0
L2 *= fade; R2 *= fade
peak = max(np.abs(L2).max(), np.abs(R2).max())
L2 = np.tanh(1.3 * L2 / peak) / np.tanh(1.3) * 0.94; R2 = np.tanh(1.3 * R2 / peak) / np.tanh(1.3) * 0.94
data = (np.stack([L2, R2], 1)[int(TAP_AT * SR):int(5.8 * SR)] * 32767).astype('<i2')
WAV = '/tmp/fahtzee-splash.wav'
with wave.open(WAV, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())


MP3 = '/tmp/fahtzee-splash.mp3'
subprocess.run([os.environ.get('FFMPEG', 'ffmpeg'), '-y', '-loglevel', 'error', '-i', WAV,
                '-c:a', 'libmp3lame', '-b:a', '80k', '-ac', '2', MP3], check=True)
b64 = base64.b64encode(open(MP3, 'rb').read()).decode()
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'splash-audio.js')
with open(out, 'w') as f:
    f.write('// GENERATED by tools/splash-score.py: the splash soundtrack as an MP3,\n')
    f.write('// starting at the moment of the tap. Do not edit; rerun the script.\n')
    f.write(f'export const SPLASH_AUDIO_AT = {TAP_AT};\n')
    f.write(f'export const SPLASH_AUDIO = "{b64}";\n')
print(f'wrote src/splash-audio.js: {len(b64) // 1024} KB of base64')
