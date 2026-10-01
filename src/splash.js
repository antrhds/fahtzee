// The opening splash: a single pip becomes a die, the die becomes five, the
// five land as a Fahtzee. Drawn live on a canvas (no video file, so it costs a
// few KB and works offline). Every frame is a pure function of the time t, so
// it can be scrubbed, tested, and dropped frames simply catch up.
//
// Coordinates are a virtual portrait stage 1080 wide x 1920 tall, scaled to
// fit the screen; the stage grows in whichever direction the screen has
// spare, so the background always fills it and the content stays centred.
import { COLOUR_CHOICES, PIP_LAYOUTS } from "./constants.js";

export const SPLASH_LENGTH = 5.0; // seconds, then it holds and fades
export const TAP_AT = 1.45; // the moment the still card holds; the tap resumes from here

const hex = Object.fromEntries(COLOUR_CHOICES.map((c) => [c.name.toLowerCase(), c.hex]));
const PAL = [hex.red, hex.orange, hex.yellow, hex.green, hex.blue, hex.purple];
const ROW = [hex.red, hex.blue, hex.yellow, hex.green, hex.purple];
const GOLD = "#FFC94A", BG = "#17132B", TAU = Math.PI * 2;
const WORD_FONT = "'Baloo 2', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
const TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---------- maths ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * TAU / 3) + 1),
};
const spring = (t, k = 7, w = 10) => (t <= 0 ? 0 : 1 - Math.exp(-k * t) * Math.cos(w * t));
const hop = (tau, T, h) => {
  if (tau <= 0) return 0;
  if (tau < T) { const u = tau / T; return -h * 4 * u * (1 - u); }
  const u = (tau - T) / (T * 0.34);
  return u < 1 ? -h * 0.11 * 4 * u * (1 - u) : 0;
};
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a = 1, m = 1) =>
  `rgba(${Math.round(clamp(c[0] * m, 0, 255))},${Math.round(clamp(c[1] * m, 0, 255))},${Math.round(clamp(c[2] * m, 0, 255))},${a})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const WHITE = [255, 255, 255];
// Same rule as the game's dice: dark pips on bright colours, white on dark ones
const pipFor = (h) => { const [r, g, b] = rgbOf(h); return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? rgbOf("#17132B") : WHITE; };

// ---------- 3D ----------
const Rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const Ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const Rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function mm(A, B) {
  const R = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    R[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return R;
}
const mv = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const tr = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
function m2q(m) {
  const t = m[0] + m[4] + m[8]; let w, x, y, z;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = 0.25 * s; x = (m[7] - m[5]) / s; y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s; }
  else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; w = (m[7] - m[5]) / s; x = 0.25 * s; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s; }
  else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = 0.25 * s; z = (m[5] + m[7]) / s; }
  else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = 0.25 * s; }
  return [w, x, y, z];
}
const q2m = ([w, x, y, z]) => [
  1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
  2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
  2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
function slerpToId(q, e) {
  let [w, x, y, z] = q;
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
  const th = Math.acos(clamp(w, -1, 1));
  if (th < 1e-5) return [1, 0, 0, 0];
  const s = Math.sin(th), a = Math.sin((1 - e) * th) / s, b = Math.sin(e * th) / s;
  return [a * w + b, a * x, a * y, a * z];
}
const axisRot = (ax, ang) => { const [x, y, z] = norm(ax); const s = Math.sin(ang / 2); return q2m([Math.cos(ang / 2), x * s, y * s, z * s]); };
const BASE = { 1: I3, 6: Ry(Math.PI), 3: Ry(Math.PI / 2), 4: Ry(-Math.PI / 2), 2: Rx(Math.PI / 2), 5: Rx(-Math.PI / 2) };
const TILT = mm(Rx(0.36), Ry(-0.44));
// Travel from orientation Mstart (e=0) to resting on face v (e=1), tumbling on the way
function orientTo(Mstart, v, e, axis, spins) {
  const R0 = mm(mm(tr(TILT), Mstart), tr(BASE[v]));
  return mm(mm(TILT, mm(axisRot(axis, spins * TAU * (1 - e)), q2m(slerpToId(m2q(R0), e)))), BASE[v]);
}
const rest = (v) => mm(TILT, BASE[v]);

const CAMD = 2200;
const LIGHT = norm([-0.45, -0.8, -1]);
const FACES = [
  { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], val: 1 }, { n: [0, 0, 1], u: [-1, 0, 0], v: [0, 1, 0], val: 6 },
  { n: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], val: 3 }, { n: [-1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], val: 4 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], val: 2 }, { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], val: 5 }];
const RAD = 0.56; // the game's die corner radius (0.28 x side) in half-size units
function roundUnit(e, r, n = 6) {
  const pts = [], cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let k = 0; k < 4; k++) {
    const [sx, sy] = cs[k], cx = sx * (e - r), cy = sy * (e - r), a0 = (k * Math.PI) / 2;
    for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  return pts;
}
const RU = roundUnit(0.94, RAD - 0.06), RB = roundUnit(1, RAD);
const CIRC = [...Array(16)].map((_, k) => [Math.cos((k / 16) * TAU), Math.sin((k / 16) * TAU)]);
const SPH = (() => { const n = 40, a = []; for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = i * 2.39996; a.push([Math.cos(th) * r, y, Math.sin(th) * r]); } return a; })();
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
const faceLum = (n) => 0.4 + 0.6 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Fixed choreography, seeded so it plays identically every time
const R0 = rng(42);
const START = [...Array(5)].map(() => axisRot([R0() - 0.5, R0() - 0.5, R0() - 0.5], R0() * TAU));
const AXES = [...Array(5)].map(() => [R0() - 0.5, R0() - 0.5, R0() - 0.5]);
const mainDieM = (t) => { const a = E.inOutCubic(inv(1.5, 2.0, t)); return mm(mm(Rx(0.5 * a), Ry(-1.05 * a)), mm(Rz(0.18 * a), BASE[5])); };
const DUST = (() => { const r = rng(7); return [...Array(50)].map(() => ({ x: r(), y: r(), s: 1 + r() * 3.5, vx: (r() - 0.5) * 30, vy: -10 - r() * 25, ph: r() * TAU })); })();
const CONF = (() => {
  const r = rng(99), cols = [...PAL, GOLD, "#FFFFFF"], arr = [];
  for (let i = 0; i < 240; i++) {
    const side = i % 3; let sx, vx, vy;
    if (side < 2) { const a = -Math.PI / 2 + (side ? -1 : 1) * (0.25 + r() * 0.5), sp = 1700 + r() * 1300; sx = side; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    else { const a = r() * TAU, sp = 400 + r() * 1400; sx = 0.5; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp - 500; }
    arr.push({ side, sx, vx, vy, k: 1.6 + r() * 1.4, col: cols[(r() * cols.length) | 0], w: 10 + r() * 10, h: 16 + r() * 14, a0: r() * TAU, wa: (r() - 0.5) * 14, wf: 6 + r() * 10, sw: 30 + r() * 60, ph: r() * TAU, d: r() * 0.06, jx: (r() - 0.5) * 200 });
  }
  return arr;
})();
const HITS = [[2.0, 12], [2.8, 30], [3.9, 4]];
const ROWX = [-380, -190, 0, 190, 380], ROWY = -300, DSIZE = 150, BOOM = 2.8;

// ---------- the renderer ----------
export function createSplash(canvas) {
  const g = canvas.getContext && canvas.getContext("2d");
  if (!g) return null;
  let W = 1080, H = 1920, CX = 540, CY = 960, K = 1;
  const ST = (a, b, c, d, e, f) => g.setTransform(a * K, b * K, c * K, d * K, e * K, f * K);
  const proj = (p) => { const s = CAMD / (CAMD + p[2]); return [CX + p[0] * s, CY + p[1] * s, s]; };

  function resize(cssW, cssH, dpr) {
    const s = Math.min(cssW / 1080, cssH / 1920);
    K = s * dpr; W = cssW / s; H = cssH / s; CX = W / 2; CY = H / 2;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  }

  function shake(t) {
    let x = 0, y = 0;
    for (const [h, a] of HITS) {
      const d = t - h;
      if (d > 0 && d < 0.9) { const e = a * Math.exp(-d * 8); x += e * Math.sin(d * 83 + h * 3); y += e * Math.cos(d * 71 + h * 5); }
    }
    return [x, y];
  }

  function drawDie(d) {
    const h = d.s / 2, c = rgbOf(d.col), pc = d.pipc || pipFor(d.col), M = d.M;
    if (h < 0.5) return;
    const cx = d.x, cy = d.y, cz = d.z || 0;
    g.save();
    if (d.floor != null) {
      const lift = Math.max(0, d.floor - cy), sp = proj([cx, d.floor + h * 0.95, cz]);
      const sw = h * 1.3 * (1 + lift / 420) * sp[2], sa = 0.55 / (1 + lift / 140);
      g.save(); g.translate(sp[0], sp[1]); g.scale(1, 0.26);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, sw);
      gr.addColorStop(0, `rgba(0,0,0,${sa})`); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(-sw, -sw, 2 * sw, 2 * sw); g.restore();
    }
    if (d.glow) {
      const p = proj([cx, cy, cz]), r = h * 2.6 * p[2], gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      gr.addColorStop(0, rgba(c, 0.42 * d.glow)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
    }
    // Rounded cube: the silhouette is the hull of eight corner spheres
    const rad = RAD * h, k = h - rad, pts = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const o = mv(M, [sx * k, sy * k, sz * k]);
      for (const q of SPH) pts.push(proj([cx + o[0] + q[0] * rad, cy + o[1] + q[1] * rad, cz + o[2] + q[2] * rad]));
    }
    const hp = hull(pts);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    g.beginPath();
    hp.forEach((q, i) => { i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    g.closePath();
    const bgr = g.createLinearGradient(x0, y0, x1, y1);
    bgr.addColorStop(0, rgba(c, 1, 0.78)); bgr.addColorStop(1, rgba(c, 1, 0.42));
    g.fillStyle = bgr; g.fill(); g.clip();
    for (const f of FACES) {
      const n = mv(M, f.n), fc = [cx + n[0] * h, cy + n[1] * h, cz + n[2] * h];
      if (n[0] * fc[0] + n[1] * fc[1] + n[2] * (fc[2] + CAMD) >= 0) continue;
      const u = mv(M, f.u), v = mv(M, f.v), lum = faceLum(n);
      const P = (A, B) => proj([fc[0] + u[0] * A + v[0] * B, fc[1] + u[1] * A + v[1] * B, fc[2] + u[2] * A + v[2] * B]);
      g.beginPath();
      RU.forEach(([A, B], i) => { const q = P(A * h, B * h); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
      g.closePath();
      const g0 = P(-h, -h), g1 = P(h, h), gr = g.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
      gr.addColorStop(0, rgba(mixc(c, WHITE, 0.3), 1, lum)); gr.addColorStop(1, rgba(c, 1, lum * 0.88));
      g.fillStyle = gr; g.fill();
      g.fillStyle = rgba(pc, 1, 0.7 + 0.3 * lum);
      for (const [r, cc] of PIP_LAYOUTS[f.val]) {
        const A = (cc - 1) * h * 0.48, B = (r - 1) * h * 0.48;
        g.beginPath();
        CIRC.forEach(([ca, sa], j) => { const q = P(A + ca * h * 0.16, B + sa * h * 0.16); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
        g.closePath(); g.fill();
      }
    }
    g.restore();
  }

  function ring(x, y, t0, t, dur, r0, r1, w0, col) {
    const p = (t - t0) / dur;
    if (p <= 0 || p >= 1) return;
    g.beginPath(); g.arc(x, y, lerp(r0, r1, E.outExpo(p)), 0, TAU);
    g.lineWidth = w0 * (1 - p); g.strokeStyle = col; g.globalAlpha = 1 - p * p; g.stroke(); g.globalAlpha = 1;
  }
  function burst(x, y, t0, t, r0, r1, n, w) {
    const p = (t - t0) / 0.42;
    if (p <= 0 || p >= 1) return;
    const a = E.outExpo(clamp(p * 1.3)), b = E.outCubic(p);
    g.lineCap = "round"; g.lineWidth = w * (1 - p * 0.6);
    for (let i = 0; i < n; i++) {
      const an = (i / n) * TAU, ra = lerp(r0, r1, b), rb = lerp(r0, r1, a);
      if (rb - ra < 0.5) continue;
      g.strokeStyle = PAL[i % PAL.length]; g.beginPath();
      g.moveTo(x + Math.cos(an) * ra, y + Math.sin(an) * ra); g.lineTo(x + Math.cos(an) * rb, y + Math.sin(an) * rb); g.stroke();
    }
  }
  function flash(t, t0, dur, a0) {
    const p = inv(t0, t0 + dur, t);
    if (t < t0 || p >= 1) return;
    ST(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,250,240,${a0 * Math.pow(1 - p, 2.2)})`; g.fillRect(0, 0, W, H);
  }

  function background(t) {
    ST(1, 0, 0, 1, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.35 + i * 1.7, x = CX + Math.cos(a * 0.9 + i) * W * 0.4, y = CY + Math.sin(a * 1.13 + i * 2) * H * 0.2, r = 760;
      const c = rgbOf(PAL[(i * 2 + 1) % 6]), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(c, 0.08)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    for (const p of DUST) {
      const x = (((p.x * W + p.vx * t) % W) + W) % W, y = (((p.y * H + p.vy * t) % H) + H) % H;
      g.fillStyle = `rgba(255,240,220,${0.6 * (0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2 + p.ph)))})`;
      g.beginPath(); g.arc(x, y, p.s, 0, TAU); g.fill();
    }
  }

  // 0–1.5s: a pip, then three, then five; an outline draws round them and fills.
  // While waiting for the tap (idle = seconds spent waiting) it holds on the
  // finished die, breathing, with a soft ring every two seconds.
  function intro(t, idle = null) {
    const [sx, sy] = shake(t); ST(1, 0, 0, 1, sx, sy);
    if (idle === null) for (const b of [0.05, 0.5, 1.0]) ring(CX, CY, b, t, 1.3, 120, 1000, 3, "rgba(255,255,255,0.35)");
    else ring(CX, CY, Math.floor(idle / 2) * 2, idle, 1.8, 200, 900, 3, "rgba(255,255,255,0.22)");
    const h = 180, red = rgbOf(hex.red), lum = faceLum([0, 0, -1]), pipEnd = pipFor(hex.red);
    const fillP = E.outExpo(inv(1.14, 1.4, t)), drawP = E.inOutCubic(inv(0.18, 1.12, t));
    const pulse = idle !== null
      ? 0.02 * Math.sin(idle * Math.PI) * Math.min(1, idle)
      : 0.035 * [0.5, 1.0].reduce((s, b) => s + (t > b ? Math.exp(-(t - b) * 9) * Math.sin((t - b) * 22) : 0), 0);
    g.translate(CX, CY); g.scale(1 + pulse, 1 + pulse);
    const path = (pts) => { g.beginPath(); pts.forEach(([A, B], i) => (i ? g.lineTo(A * h, B * h) : g.moveTo(A * h, B * h))); g.closePath(); };
    if (fillP > 0) {
      g.save(); g.beginPath(); g.rect(-h - 4, h + 4 - (2 * h + 8) * fillP, 2 * h + 8, (2 * h + 8) * fillP); g.clip();
      path(RB); const bgr = g.createLinearGradient(-h, -h, h, h);
      bgr.addColorStop(0, rgba(red, 1, 0.78)); bgr.addColorStop(1, rgba(red, 1, 0.42)); g.fillStyle = bgr; g.fill();
      path(RU); const gr = g.createLinearGradient(-h, -h, h, h);
      gr.addColorStop(0, rgba(mixc(red, WHITE, 0.3), 1, lum)); gr.addColorStop(1, rgba(red, 1, lum * 0.88)); g.fillStyle = gr; g.fill();
      g.restore();
    }
    if (drawP > 0 && fillP < 1) {
      path(RU); const len = 4 * (2 * 0.94 * h - 2 * 0.5 * h) + TAU * 0.5 * h;
      g.setLineDash([len * drawP, len]); g.lineDashOffset = len * 0.12;
      g.lineWidth = 6; g.strokeStyle = `rgba(255,255,255,${1 - fillP})`; g.stroke(); g.setLineDash([]);
    }
    const appear = { "1,1": 0.05, "0,0": 0.5, "2,2": 0.5, "0,2": 1.0, "2,0": 1.0 };
    for (const [r, c] of PIP_LAYOUTS[5]) {
      const t0 = appear[r + "," + c], p = inv(t0, t0 + 0.7, t);
      if (p <= 0) continue;
      g.fillStyle = rgba(mixc(WHITE, pipEnd, fillP), 1, fillP > 0 ? 0.7 + 0.3 * lum : 1);
      g.beginPath(); g.arc((c - 1) * h * 0.48, (r - 1) * h * 0.48, h * 0.16 * E.outElastic(p), 0, TAU); g.fill();
    }
  }

  function wordmark(t, cx, cy, t0, size) {
    const str = "FAHTZEE", ks = size / 230;
    g.save(); g.font = `800 ${size}px ${WORD_FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    const ws = [...str].map((ch) => g.measureText(ch).width), sp = 6 * ks, tot = ws.reduce((a, b) => a + b, 0) + sp * 6;
    let x = cx - tot / 2;
    const rot = [-0.5, 0.35, -0.3, 0.45, -0.4, 0.3, -0.35];
    for (let i = 0; i < 7; i++) {
      const ts = t0 + i * 0.055, p = inv(ts, ts + 0.4, t), lx = x + ws[i] / 2;
      x += ws[i] + sp;
      if (p <= 0) continue;
      const e = E.outExpo(p), sc = lerp(3.2, 1, e), bounce = hop(t - 3.9 - i * 0.03, 0.28, 22 * ks);
      g.save(); g.translate(lx, cy + bounce); g.rotate(rot[i] * (1 - e)); g.scale(sc, sc); g.globalAlpha = clamp(p * 6);
      for (let k = 14; k > 0; k--) { g.fillStyle = k > 12 ? "#5A1E0C" : "#B34A18"; g.fillText(str[i], k * 0.55 * ks, k * 1.1 * ks); }
      const gr = g.createLinearGradient(0, -110 * ks, 0, 110 * ks);
      gr.addColorStop(0, "#FFF1A8"); gr.addColorStop(0.45, "#FFD23F"); gr.addColorStop(1, "#FF8A2B");
      g.fillStyle = gr; g.fillText(str[i], 0, 0);
      const gl = inv(3.62 + i * 0.04, 3.97 + i * 0.04, t);
      if (gl > 0 && gl < 1) {
        g.globalCompositeOperation = "source-atop";
        const gx = lerp(-200, 200, gl) * ks, g2 = g.createLinearGradient(gx - 60 * ks, -120 * ks, gx + 60 * ks, 120 * ks);
        g2.addColorStop(0, "rgba(255,255,255,0)"); g2.addColorStop(0.5, "rgba(255,255,255,0.85)"); g2.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = g2; g.fillRect(-200 * ks, -150 * ks, 400 * ks, 300 * ks);
      }
      g.restore();
    }
    g.restore();
    return tot;
  }

  function confetti(t) {
    const tau0 = t - BOOM;
    if (tau0 <= 0) return;
    ST(1, 0, 0, 1, 0, 0);
    const G = 1400;
    for (const p of CONF) {
      const tau = tau0 - p.d;
      if (tau <= 0) continue;
      const ek = (1 - Math.exp(-p.k * tau)) / p.k, vt = G / p.k;
      const x0 = p.side < 2 ? (p.sx ? W + 40 : -40) : CX + p.jx, y0 = p.side < 2 ? H + 40 : CY - 60;
      const x = x0 + p.vx * ek + Math.sin(tau * p.wf * 0.5 + p.ph) * p.sw * clamp(tau), y = y0 + p.vy * ek + vt * (tau - ek);
      if (y > H + 60 && tau > 0.5) continue;
      g.save(); g.translate(x, y); g.rotate(p.a0 + p.wa * tau); g.scale(1, Math.cos(tau * p.wf + p.ph));
      g.fillStyle = p.col; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
  }

  // 1.5s on: the die winds up, bursts into five, they land as five sixes, FAHTZEE
  function finale(t) {
    if (t > BOOM) {
      const e = E.outExpo(inv(BOOM, BOOM + 0.7, t));
      ST(1, 0, 0, 1, 0, 0); g.save(); g.translate(CX, CY - 60); g.rotate(t * 0.22); g.scale(e, e);
      for (let i = 0; i < 18; i++) {
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1700, (i / 18) * TAU, ((i + 0.5) / 18) * TAU); g.closePath();
        g.fillStyle = i % 2 ? "rgba(255,201,74,0.07)" : "rgba(255,90,95,0.05)"; g.fill();
      }
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, 650);
      cg.addColorStop(0, "rgba(255,210,63,0.22)"); cg.addColorStop(1, "rgba(255,210,63,0)");
      g.fillStyle = cg; g.fillRect(-650, -650, 1300, 1300); g.restore();
    }
    const [sx, sy] = shake(t); ST(1, 0, 0, 1, sx, sy);
    const ds = [];
    if (t < 2.0) ds.push({ x: 0, y: 0, z: 0, s: 360 * lerp(1, 0.8, E.inCubic(inv(1.5, 2.0, t))), M: mainDieM(t), col: hex.red });
    else for (let i = 0; i < 5; i++) {
      const tau = t - 2.0 - Math.abs(i - 2) * 0.04, T = 0.6;
      const x = ROWX[i] * spring(tau);
      let y = lerp(0, ROWY, E.outCubic(clamp(tau / T))) + hop(tau, T, [260, 320, 280, 330, 270][i]);
      const z = i === 2 ? 0 : 600 * (1 - E.outCubic(clamp(tau / T)));
      const s = i === 2 ? lerp(288, DSIZE, E.outExpo(clamp(tau / 0.5))) : DSIZE * E.outBack(clamp(tau / 0.34));
      let M = orientTo(i === 2 ? mainDieM(2.0) : START[i], 6, E.outCubic(clamp(tau / 0.76)), AXES[i], i === 2 ? 1 : 2);
      const tc = t - (BOOM + 0.06 + i * 0.05);
      if (tc > 0) { M = mm(Rx(-TAU * E.inOutCubic(clamp(tc / 0.5))), rest(6)); y += hop(tc, 0.5, 130); }
      y += hop(t - 3.9 - i * 0.035, 0.26, 30);
      ds.push({ x, y, z, s, M, col: ROW[i], floor: ROWY, glow: t > BOOM ? 0.55 * E.outExpo(inv(BOOM, BOOM + 0.5, t)) : 0 });
    }
    ds.sort((a, b) => b.z - a.z);
    for (const d of ds) drawDie(d);
    burst(CX, CY, 2.0, t, 190, 330, 10, 8);
    ring(CX, CY, 2.0, t, 0.7, 150, 900, 26, "rgba(255,255,255,0.9)");
    ring(CX, CY - 60, BOOM, t, 0.8, 60, 1500, 60, "rgba(255,201,74,0.95)");
    ring(CX, CY - 60, BOOM + 0.07, t, 0.8, 40, 1200, 22, "rgba(255,255,255,0.9)");
    if (t > BOOM) {
      const tot = wordmark(t, CX, CY - 20, BOOM + 0.05, 165);
      const bw = tot + 36, by = CY + 90;
      for (let i = 0; i < 6; i++) {
        const p = E.outExpo(inv(3.55 + Math.abs(i - 2.5) * 0.05, 4.05 + Math.abs(i - 2.5) * 0.05, t));
        if (p <= 0) continue;
        const segW = bw / 6, cxs = CX - bw / 2 + segW * (i + 0.5);
        g.fillStyle = PAL[i]; rr(g, cxs - (segW / 2) * p + 3, by, Math.max(0, segW * p - 6), 10, 5); g.fill();
      }
      const tp = inv(3.75, 4.3, t);
      if (tp > 0) {
        g.save(); g.globalAlpha = E.outCubic(tp); g.font = `500 44px ${TEXT_FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
        g.letterSpacing = `${lerp(22, 2, E.outExpo(tp))}px`; g.fillStyle = "rgba(255,255,255,0.85)";
        g.fillText("No arguing with the dice.", CX, by + 95); g.restore();
      }
    }
    confetti(t);
    flash(t, 2.0, 0.22, 0.55);
    flash(t, BOOM, 0.4, 0.95);
  }

  // bgShift keeps the drifting background continuous across the tap
  function draw(t, bgShift = 0) {
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    background(t + bgShift);
    if (t < 1.5) intro(t);
    else finale(t);
    vignette();
  }
  function vignette() {
    ST(1, 0, 0, 1, 0, 0);
    const vg = g.createRadialGradient(CX, CY, Math.min(W, H) * 0.45, CX, CY, Math.max(W, H) * 0.65);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  // The still card shown until the first tap: the finished die from the intro
  function drawIdle(idle) {
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    background(idle);
    intro(TAP_AT, idle);
    vignette();
  }

  return { resize, draw, drawIdle };
}
