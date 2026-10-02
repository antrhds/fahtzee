// The Fahtzee cut-scene: the moment five dice land alike, the game stops for a
// few seconds of cinema. Letterbox bars slide in, the five dice fly in one by
// one in slow motion and thud into a row, they hop together, and FAHTZEE slams
// in letter by letter over speed lines, then the bars slide away and the game
// carries on. Drawn on a canvas; every frame is a pure function of t.
//
// Same virtual stage as the milestone: 1080 units wide, centred on the screen.
import { clamp, inv, outCubic, rng, drawDie } from "./milestone.js";
import { COLOUR_CHOICES } from "./constants.js";

export const SCENE_LENGTH = 4.4; // seconds, then it leaves by itself
export const WORD_AT = 1.75; // the first letter lands (the announcer speaks here)
const BARS_OUT = 3.85; // the letterbox starts to leave
const LAND = 0.42; // each die's flight
const DIE = 150, GAP = 180, DICE_Y = -150, WORD_Y = 150;
const WORD = "FAHTZEE";
const TAU = Math.PI * 2;
const PAL = COLOUR_CHOICES.map((c) => c.hex);
const FONT = "'Baloo 2', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
const outBack = (t) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// Each die's run-up, fixed by seed
const FLIGHTS = (() => {
  const r = rng(55555);
  return [0, 1, 2, 3, 4].map((i) => ({
    at: 0.3 + i * 0.17,
    side: i % 2 ? 1 : -1,
    y0: -700 + r() * 500,
    spins: (2 + r() * 1.5) * (i % 2 ? -1 : 1),
  }));
})();
const SPARKS = (() => {
  const r = rng(777);
  return [...Array(90)].map((_, i) => ({ a: r() * TAU, sp: 500 + r() * 1100, z: 10 + r() * 14, c: i }));
})();
const RAYS = (() => {
  const r = rng(31);
  return [...Array(56)].map(() => ({ a: r() * TAU, w: 0.006 + r() * 0.02, r0: 260 + r() * 260 }));
})();

export function createScene(canvas) {
  const g = canvas && canvas.getContext && canvas.getContext("2d");
  if (!g) return null;
  let W = 360, H = 740, dpr = 1, s = 1;
  const resize = (w, h, ratio = 1) => {
    W = w; H = h; dpr = ratio;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    s = Math.min(w / 1080, h / 1500);
  };

  // face: what was rolled (1-6). colour: the roller's die colour (stored hex).
  // title: the line above ("TONY ROLLS A"), sub: the line below ("Five sixes.")
  const draw = (t, { face = 6, colour = "#FFD23F", title = "", sub = "" } = {}) => {
    const SW = W / s, SH = H / s;
    const pal = [colour, colour, "#FFD23F", "#FFFFFF", ...PAL];
    const leaving = inv(BARS_OUT, SCENE_LENGTH, t);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // The game dims behind, the way a cinema does
    g.fillStyle = `rgba(8,6,20,${0.94 * outCubic(inv(0, 0.3, t)) * (1 - leaving)})`;
    g.fillRect(0, 0, W, H);

    const wordT = t - WORD_AT;
    const burstT = t - (WORD_AT + 0.5);
    // Shake: a nudge per landing die, a kick per letter, a big one on the burst
    let shake = 0;
    for (const f of FLIGHTS) { const k = t - f.at - LAND; if (k > 0 && k < 0.2) shake += 14 * (1 - k / 0.2); }
    for (let k = 0; k < WORD.length; k++) { const q = wordT - k * 0.07; if (q > 0 && q < 0.15) shake += 10 * (1 - q / 0.15); }
    if (burstT > 0 && burstT < 0.4) shake += 34 * (1 - burstT / 0.4);
    const sx = Math.sin(t * 87) * shake, sy = Math.cos(t * 71) * shake;
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 + sx * s), dpr * (H / 2 + sy * s));

    // Speed lines, flickering, strongest as the word lands
    const rayA = (wordT > 0 ? 0.16 + 0.2 * Math.exp(-wordT * 2) : 0.08 * inv(0.2, 1.6, t)) * (1 - leaving);
    if (rayA > 0.005) {
      const flick = Math.floor(t * 20);
      const reach = Math.hypot(SW, SH);
      g.fillStyle = `rgba(255,255,255,${rayA})`;
      RAYS.forEach((ry, i) => {
        if ((i * 7 + flick) % 5 === 0) return;
        const a = ry.a + Math.sin(flick * 1.3 + i) * 0.01;
        g.beginPath();
        g.moveTo(Math.cos(a - ry.w) * ry.r0, Math.sin(a - ry.w) * ry.r0);
        g.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
        g.lineTo(Math.cos(a + ry.w) * ry.r0, Math.sin(a + ry.w) * ry.r0);
        g.fill();
      });
    }

    // Glow in the roller's colour
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 700);
    glow.addColorStop(0, rgba(colour, (wordT > 0 ? 0.4 : 0.18) * (1 - leaving)));
    glow.addColorStop(1, rgba(colour, 0));
    g.fillStyle = glow;
    g.fillRect(-700, -700, 1400, 1400);

    // Sparks from the burst
    if (burstT > 0 && burstT < 1.8) {
      g.globalCompositeOperation = "lighter";
      const reach = (1 - Math.exp(-3 * burstT)) / 3;
      SPARKS.forEach((p) => {
        g.fillStyle = rgba(pal[p.c % pal.length], (1 - burstT / 1.8) * (1 - leaving));
        const x = Math.cos(p.a) * p.sp * reach, y = WORD_Y - 60 + Math.sin(p.a) * p.sp * reach + 300 * burstT * burstT;
        g.fillRect(x - p.z / 2, y - p.z / 2, p.z, p.z);
      });
      g.globalCompositeOperation = "source-over";
    }

    // The dice: fly in one by one, thud into a row, then hop together on the word
    const hopT = t - (WORD_AT - 0.2);
    const hop = hopT > 0 && hopT < 0.35 ? -90 * Math.sin((hopT / 0.35) * Math.PI) : 0;
    FLIGHTS.forEach((f, i) => {
      const k = t - f.at;
      if (k <= 0) return;
      const u = clamp(k / LAND);
      const e = outCubic(u);
      const tx = (i - 2) * GAP, x0 = f.side * (SW / 2 + 200);
      const x = x0 + (tx - x0) * e;
      const y = f.y0 + (DICE_Y - f.y0) * e - Math.sin(u * Math.PI) * 160 + hop;
      const spin = f.spins * TAU * (1 - e);
      // squash on landing
      const land = k - LAND;
      const squash = land > 0 && land < 0.18 ? 1 - 0.18 * Math.sin((land / 0.18) * Math.PI) : 1;
      const out = leaving > 0 ? 1 - outCubic(leaving) : 1;
      // landing ring
      if (land > 0 && land < 0.4) {
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - land / 0.4)})`;
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(tx, DICE_Y + DIE * 0.55, 60 + land * 260, 14 + land * 60, 0, 0, TAU);
        g.stroke();
      }
      g.save();
      g.translate(x, y);
      g.rotate(spin);
      g.scale(out * (2 - squash), out * squash);
      g.shadowColor = rgba(colour, 0.9);
      g.shadowBlur = wordT > 0 ? 40 : 18;
      drawDie(g, DIE, face, colour);
      g.restore();
    });

    // The word, letter by letter
    if (wordT > 0) {
      g.font = `800 230px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const widths = [...WORD].map((ch) => g.measureText(ch).width * 0.92);
      const total = widths.reduce((a, b) => a + b, 0);
      const fit = Math.min(1, (SW - 80) / total);
      let x = -total / 2;
      const sweep = wordT > 0.7 ? ((wordT - 0.7) * 0.8) % 1.4 - 0.2 : -1;
      [...WORD].forEach((ch, k) => {
        const q = wordT - k * 0.07;
        const cx = x + widths[k] / 2;
        x += widths[k];
        if (q <= 0) return;
        const pop = q < 0.3 ? 3 - 2 * outBack(q / 0.3) : 1;
        const out = 1 - outCubic(leaving);
        g.save();
        g.translate(cx * fit, WORD_Y);
        g.scale(pop * fit * out, pop * fit * out);
        g.rotate((k % 2 ? 1 : -1) * 0.05 * Math.exp(-q * 4));
        g.globalAlpha = clamp(q / 0.08);
        const fill = g.createLinearGradient(0, -100, 0, 100);
        const lit = Math.abs(cx / total + 0.5 - sweep) < 0.08;
        fill.addColorStop(0, lit ? "#FFFFFF" : "#FFF3C4");
        fill.addColorStop(0.55, lit ? "#FFF6D8" : "#FFC94A");
        fill.addColorStop(1, "#E8901A");
        g.lineJoin = "round";
        g.lineWidth = 22;
        g.strokeStyle = "#2A1206";
        g.shadowColor = rgba(colour, 0.95);
        g.shadowBlur = 50;
        g.strokeText(ch, 0, 8);
        g.shadowBlur = 0;
        g.fillStyle = fill;
        g.fillText(ch, 0, 8);
        g.restore();
      });
      g.globalAlpha = 1;
    }

    // The captions: who, above; what, below
    const caption = (text, y, at, size, colourStr) => {
      const a = clamp((t - at) / 0.3) * (1 - leaving);
      if (a <= 0 || !text) return;
      g.font = `800 ${size}px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const w = g.measureText(text).width;
      const fit = Math.min(1, (SW - 100) / w);
      g.save();
      g.translate(0, y + (1 - outCubic(clamp((t - at) / 0.3))) * 30);
      g.scale(fit, fit);
      g.globalAlpha = a;
      g.fillStyle = colourStr;
      g.shadowColor = "rgba(0,0,0,0.8)";
      g.shadowBlur = 12;
      g.fillText(text, 0, 0);
      g.restore();
      g.globalAlpha = 1;
    };
    caption(title, DICE_Y - 210, 0.5, 64, colour);
    caption(sub, WORD_Y + 190, WORD_AT + 0.75, 54, "rgba(245,243,250,0.9)");

    // Flash on the burst
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (burstT > 0 && burstT < 0.35) {
      g.fillStyle = `rgba(255,250,230,${0.7 * Math.pow(1 - burstT / 0.35, 2)})`;
      g.fillRect(0, 0, W, H);
    }

    // Letterbox bars, last, over everything
    const bar = H * 0.11 * outCubic(inv(0, 0.35, t)) * (1 - outCubic(leaving));
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, bar);
    g.fillRect(0, H - bar, W, bar);
  };

  return { resize, draw };
}
