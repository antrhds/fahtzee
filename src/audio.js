// Fahtzee audio: synth engine, optional recorded samples, speech, haptics

// ---------- The Fahtzee voice ----------
export const say = (text, opts = {}) => {
  try {
    if (!soundEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
};
export const sayFahtzee = () => say("Fart sea!", { rate: 0.85, pitch: 1.15 });

// ---------- Sound engine (Web Audio, no assets) ----------
let _audioCtx = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch { return null; }
};
const tone = (ctx, freq, start, dur, type = "triangle", vol = 0.12) => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
};
const SFX = {
  rattle: () => {
    const ctx = getCtx(); if (!ctx) return;
    const canPan = typeof ctx.createStereoPanner === "function";
    // One die impact: bright click + mid snap + woody knock, randomly panned
    const impact = (when, energy) => {
      const t0 = ctx.currentTime + when;
      const pan = canPan ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = (Math.random() * 2 - 1) * 0.7;
      const out = pan || ctx.destination;
      if (pan) pan.connect(ctx.destination);
      // Bright click: short noise burst through a high bandpass
      const clickLen = 0.008 + Math.random() * 0.012;
      const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * clickLen), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const click = ctx.createBufferSource();
      click.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = "bandpass";
      hp.frequency.value = 3600 + Math.random() * 3000;
      hp.Q.value = 0.9;
      const cg = ctx.createGain();
      cg.gain.value = 0.4 * energy;
      click.connect(hp).connect(cg).connect(out);
      click.start(t0);
      // Mid snap: the plasticky "tock"
      const snap = ctx.createOscillator();
      snap.type = "triangle";
      snap.frequency.setValueAtTime(900 + Math.random() * 700, t0);
      snap.frequency.exponentialRampToValueAtTime(300, t0 + 0.03);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.18 * energy, t0);
      sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
      snap.connect(sg).connect(out);
      snap.start(t0);
      snap.stop(t0 + 0.06);
      // Woody body knock: low damped thump with pitch drop
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(150 + Math.random() * 130, t0);
      o.frequency.exponentialRampToValueAtTime(70, t0 + 0.06);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.28 * energy, t0);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07 + Math.random() * 0.04);
      o.connect(og).connect(out);
      o.start(t0);
      o.stop(t0 + 0.14);
    };
    // Soft table rumble underneath the whole roll
    const rumbleLen = 0.55;
    const rbuf = ctx.createBuffer(1, ctx.sampleRate * rumbleLen, ctx.sampleRate);
    const rd = rbuf.getChannelData(0);
    for (let i = 0; i < rd.length; i++) {
      const t = i / rd.length;
      rd[i] = (Math.random() * 2 - 1) * 0.5 * Math.sin(Math.PI * Math.min(1, t * 3)) * (1 - t);
    }
    const rumble = ctx.createBufferSource();
    rumble.buffer = rbuf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const rg = ctx.createGain();
    rg.gain.value = 0.5;
    rumble.connect(lp).connect(rg).connect(ctx.destination);
    rumble.start();
    // Tumble: impacts start dense and hard, thin out, with occasional double-bounces
    let t = 0.015;
    const total = 0.48;
    while (t < total) {
      const progress = t / total;
      const energy = 1 - progress * 0.6;
      impact(t, energy);
      if (Math.random() > 0.72) impact(t + 0.012 + Math.random() * 0.01, energy * 0.45); // double bounce
      t += 0.02 + progress * 0.075 + Math.random() * 0.028;
    }
    // Settling ticks
    impact(total + 0.06, 0.28);
    if (Math.random() > 0.35) impact(total + 0.13 + Math.random() * 0.06, 0.16);
    if (Math.random() > 0.7) impact(total + 0.22 + Math.random() * 0.05, 0.1);
  },
  hold: () => { const ctx = getCtx(); if (ctx) tone(ctx, 620, 0, 0.07, "sine", 0.08); },
  bank: () => {
    const ctx = getCtx(); if (!ctx) return;
    tone(ctx, 523, 0, 0.1, "triangle", 0.12);
    tone(ctx, 784, 0.08, 0.14, "triangle", 0.12);
  },
  fahtzee: () => {
    const ctx = getCtx(); if (!ctx) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, f, i * 0.09, 0.22, "square", 0.09));
  },
  win: () => {
    const ctx = getCtx(); if (!ctx) return;
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.13, 0.26, "triangle", 0.13));
  },
  // The milestone: a counter ticking up and up, a drum roll on 499, then a slam,
  // a brass chord, a fanfare and fireworks. Timed to src/milestone.js (slam at 2.9s).
  milestone: () => {
    const ctx = getCtx(); if (!ctx) return;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    _milestoneOut = out;
    const t0 = ctx.currentTime;
    const noise = (when, dur, freq, q, vol, type = "bandpass") => {
      const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0 + when);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
      src.connect(f).connect(g).connect(out);
      src.start(t0 + when);
    };
    const note = (freq, when, dur, type, vol, glide) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0 + when);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + when + dur);
      g.gain.setValueAtTime(0.0001, t0 + when);
      g.gain.exponentialRampToValueAtTime(vol, t0 + when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
      o.connect(g).connect(out);
      o.start(t0 + when);
      o.stop(t0 + when + dur + 0.05);
    };
    // The counter: ticks that start quick and slow down, climbing in pitch
    for (let i = 0, t = 0.5; t < 2.45; i++) {
      note(700 + i * 22, t, 0.04, "square", 0.05);
      t += 0.035 + 0.11 * Math.pow((t - 0.5) / 1.95, 2);
    }
    // Drum roll on 499, swelling
    for (let t = 2.45; t < 2.88; t += 0.028) noise(t, 0.05, 1800, 0.7, 0.08 + 0.3 * ((t - 2.45) / 0.43));
    // The slam: a sub boom, a crash and a big brass chord
    note(110, 2.9, 0.9, "sine", 0.6, 38);
    noise(2.9, 1.6, 5000, 0.4, 0.35, "highpass");
    noise(2.9, 0.3, 200, 0.8, 0.6, "lowpass");
    [131, 196, 262, 330, 392, 523].forEach((f) => {
      note(f, 2.92, 1.6, "sawtooth", 0.05);
      note(f * 1.004, 2.92, 1.6, "triangle", 0.08);
    });
    // Fanfare: da-da-da-DAAA
    [[523, 3.5, 0.14], [523, 3.66, 0.14], [523, 3.82, 0.14], [784, 3.98, 0.5], [659, 4.5, 0.16],
     [784, 4.68, 0.16], [1047, 4.86, 0.9]].forEach(([f, w, d]) => {
      note(f, w, d, "square", 0.06);
      note(f / 2, w, d, "triangle", 0.1);
    });
    // Fireworks: a whistle up, then a crackling pop, a few times over
    [3.0, 3.14, 3.26, 3.9, 4.3, 4.75, 5.2, 5.6, 6.1, 6.5].forEach((w, i) => {
      if (i > 2) note(900, w - 0.5, 0.45, "sine", 0.025, 2200);
      noise(w, 0.5, 900, 0.5, 0.35, "lowpass");
      for (let c = 0; c < 6; c++) noise(w + 0.12 + Math.random() * 0.5, 0.02, 4000, 1, 0.12);
    });
  },
};

// Fade the milestone soundtrack out early, if the player taps past it
let _milestoneOut = null;
export const hushMilestone = () => {
  try {
    if (_milestoneOut) _milestoneOut.gain.setTargetAtTime(0, _milestoneOut.context.currentTime, 0.15);
    _milestoneOut = null;
  } catch {}
};

// ---------- Recorded samples (optional, from /sounds in the repo) ----------
// Drop real recordings into a sounds/ folder next to index.html and they take
// over from the synthesised effects automatically. Supported names:
//   roll1, roll2, roll3 (variations, picked at random), hold, bank, fahtzee, win
// in .mp3, .m4a, or .wav. Anything missing falls back to the synth.
const SAMPLES = {};
let samplesRequested = false;
export const loadSamples = () => {
  if (samplesRequested || typeof fetch === "undefined") return;
  samplesRequested = true;
  const ctx = getCtx();
  if (!ctx) return;
  const defs = {
    rattle: ["roll1", "roll2", "roll3"],
    hold: ["hold"],
    bank: ["bank"],
    fahtzee: ["fahtzee"],
    win: ["win"],
  };
  Object.entries(defs).forEach(([key, names]) => {
    names.forEach(async (n) => {
      for (const ext of ["mp3", "m4a", "wav"]) {
        try {
          const res = await fetch(`sounds/${n}.${ext}`);
          if (!res.ok) continue;
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          (SAMPLES[key] = SAMPLES[key] || []).push(buf);
          return;
        } catch {}
      }
    });
  });
};
const playSample = (name) => {
  const list = SAMPLES[name];
  if (!list || !list.length) return false;
  const ctx = getCtx();
  if (!ctx) return false;
  try {
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    const g = ctx.createGain();
    g.gain.value = 0.9;
    src.connect(g).connect(ctx.destination);
    src.start();
    return true;
  } catch { return false; }
};

// A whole recorded clip (the splash soundtrack), handed over as base64 MP3.
// Call it from a click (or key) handler, never pointerdown/touchstart: phones
// only grant sound once the finger lifts, so a touch-down handler is silent.
// Resolves with a stop() once the clip is actually playing, or null if it
// cannot play (no audio, muted, or the decode failed) so callers carry on silently.
export const playClip = async (b64, volume = 0.8) => {
  if (!soundEnabled) return null;
  const ctx = getCtx();
  if (!ctx) return null;
  // Start a silent blip synchronously, still inside the tap: iPhones only
  // unlock Web Audio for good when something actually plays in the gesture.
  try {
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, 22050);
    blip.connect(ctx.destination);
    blip.start(0);
  } catch {}
  try {
    if (ctx.state !== "running") await ctx.resume();
  } catch {}
  if (ctx.state !== "running") return null;
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    src.start();
    return () => {
      try {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        src.stop(ctx.currentTime + 0.4);
      } catch {}
    };
  } catch { return null; }
};

let soundEnabled = true;
export const setSoundEnabled = (on) => { soundEnabled = on; };
export const play = (name) => { if (!soundEnabled) return; if (playSample(name)) return; try { SFX[name](); } catch {} };

// Haptic feedback (Android; iPhones ignore navigator.vibrate)
export const haptic = (pattern) => {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
};
