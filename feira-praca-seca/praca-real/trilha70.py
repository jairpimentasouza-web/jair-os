import numpy as np, wave

SR, DUR, BEAT = 44100, 70.0, 0.6  # 100 bpm, 2/4 samba
N = int(SR * DUR)
out = np.zeros(N)
rng = np.random.default_rng(3)
S16 = BEAT / 4

def add(sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    out[i:j] += gain * sig[: j - i]

def env(n, decay):
    return np.exp(-np.arange(n) / SR * decay)

def surdo(strong):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 55 + 40 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 7 if strong else 14)
    return s * (1.0 if strong else 0.5)

def noise_hit(dur, decay, hp=True):
    n = int(dur * SR); s = rng.standard_normal(n)
    if hp: s = np.diff(s, prepend=0)
    return s * env(n, decay)

def pluck(freq, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * k * freq * t) / k ** 1.3 * np.exp(-t * (6 + 3 * k)) for k in range(1, 7))
    return s

# chords (cavaquinho voicings, Hz)
D4, E4, F4, G4, A4, B4, C5, Cs5, D5, E5 = 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3, 554.4, 587.3, 659.3
chords = [[G4, C5, E5, A4], [G4, Cs5, E5, A4], [F4, A4, D5, C5], [F4, B4, D5, G4]]  # C6, A7, Dm7, G7
cav_pat = [1, 0, 1, 1, 0, 1, 0, 1]  # 16ths in a 2/4 bar
tam_pat = [1, 0, 1, 1, 0, 1, 1, 0]

bars = int(DUR / (2 * BEAT)) + 1
for b in range(bars):
    t0 = b * 2 * BEAT
    add(surdo(False), t0, 0.7); add(surdo(True), t0 + BEAT, 0.9)
    ch = chords[(b // 2) % 4]
    for k in range(8):
        tk = t0 + k * S16
        acc = 1.0 if k % 4 == 3 else 0.55
        add(noise_hit(0.08, 45), tk, 0.10 * acc)  # pandeiro jingles
        if k % 4 == 0: add(noise_hit(0.12, 30, hp=False) * 0.6 + surdo(False)[: int(0.12 * SR)] * 0.4, tk, 0.25)
        if tam_pat[k]: add(noise_hit(0.04, 90) + np.sin(2 * np.pi * 900 * np.arange(int(0.04 * SR)) / SR) * env(int(0.04 * SR), 90), tk, 0.12)
        if cav_pat[k]:
            for i, f in enumerate(ch): add(pluck(f), tk + i * 0.008, 0.10)

# crowd murmur
n = N; mur = np.cumsum(rng.standard_normal(n)); mur -= np.convolve(mur, np.ones(2000) / 2000, 'same')
mur /= np.abs(mur).max(); out += mur * 0.05

out /= np.abs(out).max(); out *= 0.85
fade_in, fade_out = int(1.0 * SR), int(2.0 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in); out[-fade_out:] *= np.linspace(1, 0, fade_out)
pcm = (out * 32767).astype(np.int16)
with wave.open('trilha70.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
