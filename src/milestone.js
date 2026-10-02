// The milestone celebration: a counter races up to 500 (or 1000, ...), stalls
// on 499 for a heartbeat, then slams home in a flash, a shockwave, a burst of
// dice and fireworks that keep going until someone taps. Drawn live on a
// canvas, and like the splash every frame is a pure function of the time t,
// so dropped frames simply catch up and a test can draw any moment it likes.
//
// Coordinates are a virtual portrait stage 1080 units wide, centred on the
// screen; it grows taller or wider to fill whatever shape the screen is.
import { COLOUR_CHOICES, PIP_LAYOUTS } from "./constants.js";

export const COUNT_FROM = 0.5; // the counter starts
export const COUNT_TO = 2.45; // ...and reaches one short of the milestone
export const SLAM = 2.9; // the milestone lands
export const NUMBER_Y = -250; // the number's centre, in stage units above the middle

const PAL = COLOUR_CHOICES.map((c) => c.hex);
const GOLD = "#FFC94A", TAU = Math.PI * 2;
const NUM_FONT = "'Baloo 2', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";

// ---------- maths ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const inv = (a, b, x) => clamp((x - a) / (b - a));
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = rgbOf(h); return `rgba(${r},${g},${b},${a})`; };
const pipFor = (h) => { const [r, g, b] = rgbOf(h); return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#17132B" : "#FFFFFF"; };

// ---------- the cast, fixed by seed so every run (and every test) agrees ----------
const DICE = (() => {
  const r = rng(500);
  return [...Array(40)].map((_, i) => {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.7; // mostly upwards, like a cork
    const sp = 450 + r() * 1100;
    return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 70 + r() * 80, spin: (r() - 0.5) * 14,
      rot0: r() * TAU, face: 1 + Math.floor(r() * 6), pal: i };
  });
})();

// Fireworks go up forever, one roughly every 0.42s; each is seeded by its index
const BURST_EVERY = 0.4, RISE = 0.55, BURST_LIFE = 2.1, SPARKS = 90;
const burst = (k) => {
  const r = rng(9000 + k * 7);
  const first = k < 3; // the opening salvo bursts at once, around the number
  return {
    at: SLAM + (first ? 0.05 + k * 0.12 : 0.6 + (k - 3) * BURST_EVERY + r() * 0.15),
    x: first ? [-330, 330, 0][k] : (r() - 0.5) * 0.9,
    y: first ? [-560, -520, -820][k] : -0.15 - r() * 0.3,
    first,
    speed: 700 + r() * 450,
    colour: r(),
    two: r() < 0.35, // a two-tone burst
    ring: r() < 0.25, // a perfect ring rather than a scatter
    seed: k,
  };
};

const CONFETTI = (() => {
  const r = rng(77);
  return [...Array(110)].map((_, i) => ({ x: r(), off: r(), speed: 160 + r() * 220, sway: 30 + r() * 60,
    swayRate: 1 + r() * 2.5, flip: 3 + r() * 6, w: 14 + r() * 14, h: 8 + r() * 8, pal: i, ph: r() * TAU }));
})();

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawDie(g, size, face, colour) {
  const h = size / 2;
  g.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(g, -h, -h + size * 0.08, size, size, size * 0.28);
  g.fill();
  g.fillStyle = colour;
  roundRect(g, -h, -h, size, size, size * 0.28);
  g.fill();
  g.fillStyle = pipFor(colour);
  const cell = size / 3.6;
  for (const [row, col] of PIP_LAYOUTS[face]) {
    g.beginPath();
    g.arc((col - 1) * cell, (row - 1) * cell, size * 0.09, 0, TAU);
    g.fill();
  }
}

export function createMilestone(canvas) {
  const g = canvas && canvas.getContext && canvas.getContext("2d");
  if (!g) return null;
  let W = 360, H = 740, dpr = 1, s = 1;

  const resize = (w, h, ratio = 1) => {
    W = w; H = h; dpr = ratio;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    s = Math.min(w / 1080, h / 1500);
  };

  // n: the milestone. colours: the players' own (stored hex), first is the star
  const draw = (t, n, colours = []) => {
    const pal = colours.length ? [...colours, ...colours, ...PAL] : PAL;
    const SW = W / s, SH = H / s; // the stage, in stage units
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // Backdrop: the game fades away behind a deep night sky
    const back = g.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, Math.max(W, H));
    back.addColorStop(0, "#2A1F4F");
    back.addColorStop(1, "#0B0818");
    g.globalAlpha = 0.96 * outCubic(inv(0, 0.5, t));
    g.fillStyle = back;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;

    const tau = t - SLAM; // time since the slam
    const landed = tau >= 0;
    // Screen shake: a tremble that builds on 499, then the slam's kick
    let sx = 0, sy = 0;
    if (!landed && t > COUNT_TO) {
      const a = 4 + 14 * inv(COUNT_TO, SLAM, t);
      sx = Math.sin(t * 91) * a; sy = Math.cos(t * 77) * a;
    } else if (landed) {
      const a = 46 * Math.exp(-tau * 5);
      sx = Math.sin(tau * 63) * a; sy = Math.cos(tau * 51) * a;
    }

    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 + sx * s), dpr * (H / 2 + sy * s));

    // Sunburst behind the number, turning slowly
    const rayA = landed ? 0.2 * outCubic(clamp(tau / 0.6)) : 0.06 * inv(COUNT_FROM, SLAM, t);
    if (rayA > 0) {
      g.save();
      g.translate(0, NUMBER_Y);
      g.rotate(t * 0.22);
      const reach = Math.hypot(SW, SH);
      const rays = g.createRadialGradient(0, 0, 60, 0, 0, reach * 0.6);
      rays.addColorStop(0, rgba(GOLD, rayA * 1.6));
      rays.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = rays;
      for (let i = 0; i < 18; i++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, reach, (i / 18) * TAU, (i / 18) * TAU + TAU / 36);
        g.closePath();
        g.fill();
      }
      g.restore();
    }

    // Glow under the number
    const glowR = landed ? 520 + 40 * Math.sin(t * 3) : 280 + 200 * inv(COUNT_FROM, SLAM, t);
    const glow = g.createRadialGradient(0, NUMBER_Y, 0, 0, NUMBER_Y, glowR);
    glow.addColorStop(0, rgba(GOLD, landed ? 0.45 : 0.25));
    glow.addColorStop(1, rgba(GOLD, 0));
    g.fillStyle = glow;
    g.fillRect(-glowR, NUMBER_Y - glowR, glowR * 2, glowR * 2);

    // Confetti, raining from the slam onwards
    if (landed) {
      for (const c of CONFETTI) {
        const fall = tau * c.speed - c.off * SH * 0.8; // staggered first drop, then it loops
        if (fall < 0) continue;
        const y = -SH / 2 - 60 + (fall % (SH + 200));
        const x = (c.x - 0.5) * SW + Math.sin(t * c.swayRate + c.ph) * c.sway;
        g.save();
        g.translate(x, y);
        g.rotate(Math.sin(t * c.swayRate + c.ph) * 0.8);
        g.scale(1, Math.cos(t * c.flip + c.ph));
        g.fillStyle = pal[c.pal % pal.length];
        g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        g.restore();
      }
    }

    // Fireworks: rockets climb from the bottom, then burst
    if (landed) {
      g.globalCompositeOperation = "lighter";
      const kMax = 3 + Math.ceil((tau + 1) / BURST_EVERY);
      for (let k = Math.max(0, kMax - Math.ceil((RISE + BURST_LIFE) / BURST_EVERY) - 4); k <= kMax; k++) {
        const b = burst(k);
        const bx = b.first ? b.x : b.x * SW;
        const by = b.first ? b.y : b.y * SH;
        const age = t - b.at; // seconds since it burst
        if (!b.first && age < 0 && age > -RISE) {
          // the rocket, trailing sparks
          const u = outCubic(1 + age / RISE);
          const ry = SH / 2 + (by - SH / 2) * u;
          for (let j = 0; j < 8; j++) {
            g.fillStyle = `rgba(255,230,170,${0.8 - j * 0.1})`;
            g.fillRect(bx - 4 + Math.sin(j * 7 + t * 40) * 3, ry + j * 22, 8, 8);
          }
        }
        if (age < 0 || age > BURST_LIFE) continue;
        const r = rng(31337 + b.seed);
        const ca = pal[Math.floor(b.colour * pal.length) % pal.length];
        const cb = pal[(Math.floor(b.colour * pal.length) + 2) % pal.length];
        const fade = 1 - age / BURST_LIFE;
        const reach = (1 - Math.exp(-3 * age)) / 3; // drag: fast out, then hangs
        if (age < 0.12) {
          // the pop
          const pop = g.createRadialGradient(bx, by, 0, bx, by, 220);
          pop.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - age / 0.12)})`);
          pop.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = pop;
          g.fillRect(bx - 220, by - 220, 440, 440);
        }
        for (let p = 0; p < SPARKS; p++) {
          const ang = b.ring ? (p / SPARKS) * TAU : r() * TAU;
          const sp = b.speed * (b.ring ? 1 : 0.35 + 0.65 * Math.sqrt(r()));
          const twinkle = age > 0.9 && r() < 0.5 ? (Math.sin(t * 40 + p) > 0 ? 1 : 0.2) : 1;
          const px = bx + Math.cos(ang) * sp * reach;
          const py = by + Math.sin(ang) * sp * reach + 260 * age * age;
          g.fillStyle = rgba(b.two && p % 2 ? cb : ca, fade * twinkle);
          const z = 15 * (0.6 + 0.4 * fade);
          g.fillRect(px - z / 2, py - z / 2, z, z);
          // a short streak behind each spark while it is still quick
          if (age < 0.5) {
            const back = reach - 0.05;
            g.fillStyle = rgba(ca, 0.35 * fade);
            g.fillRect(bx + Math.cos(ang) * sp * back - 5, by + Math.sin(ang) * sp * back - 5, 10, 10);
          }
        }
      }
      g.globalCompositeOperation = "source-over";
    }

    // Shockwave rings from the slam
    if (landed && tau < 1.4) {
      for (const [delay, width] of [[0, 60], [0.1, 26], [0.22, 12]]) {
        const u = clamp((tau - delay) / 1.2);
        if (u <= 0) continue;
        g.strokeStyle = `rgba(255,236,190,${0.85 * (1 - u)})`;
        g.lineWidth = width * (1 - u) + 2;
        g.beginPath();
        g.arc(0, NUMBER_Y, 120 + 1500 * outExpo(u), 0, TAU);
        g.stroke();
      }
    }

    // The number itself
    const shown = landed ? n : Math.floor((n - 1) * outCubic(inv(COUNT_FROM, COUNT_TO, t)));
    let scale;
    if (landed) scale = 1 + 0.55 * Math.exp(-tau * 6) * Math.cos(tau * 16); // slams in big, then settles
    else scale = 0.5 + 0.32 * outCubic(inv(COUNT_FROM, COUNT_TO, t)) + 0.06 * inv(COUNT_TO, SLAM, t);
    const appear = outCubic(inv(0.25, 0.7, t));
    if (appear > 0) {
      const fs = n >= 1000 ? 330 : 420;
      g.save();
      g.translate(0, NUMBER_Y);
      g.scale(scale, scale);
      g.globalAlpha = appear;
      g.font = `800 ${fs}px ${NUM_FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const text = String(shown);
      const half = Math.max(260, g.measureText(text).width / 2);
      // a shine sweeps across every couple of seconds once it has landed
      const sweep = landed ? ((tau * 0.45) % 1.3) - 0.15 : -1;
      const fill = g.createLinearGradient(-half, -fs / 2, half, fs / 2);
      const base = landed ? ["#FFF3C4", "#FFC94A", "#E8901A"] : ["#F4F0FF", "#CFC6EE", "#9C92C4"];
      fill.addColorStop(0, base[0]);
      if (sweep > 0.02 && sweep < 0.98) {
        fill.addColorStop(sweep - 0.02, base[1]);
        fill.addColorStop(sweep, "#FFFFFF");
        fill.addColorStop(sweep + 0.02, base[1]);
      } else fill.addColorStop(0.5, base[1]);
      fill.addColorStop(1, base[2]);
      g.lineJoin = "round";
      g.lineWidth = 26;
      g.strokeStyle = "#2A1206";
      g.shadowColor = landed ? "rgba(255,190,60,0.9)" : "rgba(180,160,255,0.5)";
      g.shadowBlur = landed ? 60 : 30;
      g.strokeText(text, 0, 8);
      g.shadowBlur = 0;
      g.fillStyle = fill;
      g.fillText(text, 0, 8);
      g.restore();
      g.globalAlpha = 1;
    }

    // Dice burst out of the number at the slam, and fall away
    if (landed && tau < 4.5) {
      for (const d of DICE) {
        const x = d.vx * tau;
        const y = NUMBER_Y + d.vy * tau + 0.5 * 1500 * tau * tau;
        if (y - d.size > SH / 2) continue;
        g.save();
        g.translate(x, y);
        g.rotate(d.rot0 + d.spin * tau);
        const grow = outCubic(clamp(tau / 0.25));
        g.scale(grow, grow);
        drawDie(g, d.size, d.face, pal[d.pal % pal.length]);
        g.restore();
      }
    }

    // The flash, last, over everything
    if (landed && tau < 0.6) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = `rgba(255,248,225,${0.85 * Math.pow(1 - tau / 0.6, 2)})`;
      g.fillRect(0, 0, W, H);
    }
  };

  return { resize, draw, scale: () => s };
}
