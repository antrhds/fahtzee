// The AI's brain, three difficulty levels: 0 easy, 1 normal, 2 ruthless.
// Easy plays by rules of thumb and does not concentrate. Normal and Ruthless look ahead:
// before each roll they work out what every possible keep is worth, over every way the
// rest could land. Simulated solo averages (test/ai.js): Easy ~163, Normal ~228, Ruthless ~243.
import { counts, SCORERS, UPPER, LOWER, UPPER_KEYS } from "./logic.js";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALL_KEYS = [...UPPER, ...LOWER].map((c) => c.key);
const fiveAlike = (dice) => counts(dice).some((c) => c === 5);

// What a hand pays in a box, joker rules included: once the Fahtzee box holds 50,
// another five alike pays Full House, the straights and the 100 bonus anywhere
const jokerOn = (dice, scores) => fiveAlike(dice) && scores.fahtzee === 50;
const pays = (key, dice, scores) => {
  if (jokerOn(dice, scores) && key !== "fahtzee") {
    if (key === "fullHouse") return 25;
    if (key === "smallStraight") return 30;
    if (key === "largeStraight") return 40;
  }
  return SCORERS[key](dice);
};

// Hold the first die of each face in `faces`
const holdFaces = (dice, faces) => {
  const want = new Set(faces);
  return dice.map((d) => (want.has(d) ? (want.delete(d), true) : false));
};

const longestRun = (dice) => {
  const uniq = [...new Set(dice)].sort((a, b) => a - b);
  let best = [], run = [uniq[0]];
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] + 1) run.push(uniq[i]);
    else { if (run.length > best.length) best = run; run = [uniq[i]]; }
  }
  return run.length > best.length ? run : best;
};

// ---------- Easy: rules of thumb ----------

const madeHand = (dice, scores) => {
  const open = (k) => scores[k] === undefined;
  return (open("fahtzee") && SCORERS.fahtzee(dice) === 50) ||
    (open("largeStraight") && SCORERS.largeStraight(dice) === 40) ||
    (open("fullHouse") && SCORERS.fullHouse(dice) === 25);
};

// Keeps a hand it has already made, holds a pair if it has one, otherwise rerolls the lot
const easyHolds = (dice, scores) => {
  if (madeHand(dice, scores) || fiveAlike(dice)) return [true, true, true, true, true];
  if (scores.smallStraight === undefined && SCORERS.smallStraight(dice) === 30) return holdFaces(dice, longestRun(dice));
  const c = counts(dice);
  let face = 6, bc = 0;
  for (let f = 6; f >= 1; f--) if (c[f - 1] > bc) { bc = c[f - 1]; face = f; }
  if (bc >= 2) return dice.map((d) => d === face);
  return [false, false, false, false, false];
};

// Stops on a made hand; otherwise always burns all three rolls
const easyStop = (dice, scores) => madeHand(dice, scores) || fiveAlike(dice);

// Takes the biggest number on offer, or more often than not the second biggest, because it is not paying attention
const easyCategory = (dice, scores) => {
  const scored = ALL_KEYS.filter((k) => scores[k] === undefined)
    .map((key) => ({ key, v: pays(key, dice, scores) }))
    .sort((a, b) => b.v - a.v);
  if (scored.length > 1 && Math.random() < 0.6 && scored[1].v > 0) return scored[1].key;
  return scored[0].key;
};

// ---------- Normal and Ruthless: look ahead ----------
// Each final hand is valued as its score in the best open box, less a share of that
// box's typical worth (so it does not squander Chance or Sixes on a poor hand), plus,
// for Ruthless, credit for progress towards the 63 upper bonus. Then backwards: the
// value of keeping some dice is the average, over every way the rest can land, of the
// best keep after that. Hands are multisets of faces (252 of them); keeps run from none
// to all five (462). Tables are built once per scorecard, a few milliseconds' work.
// Normal thinks one roll ahead and ignores the bonus; Ruthless thinks to the end of the turn.

const PAR = { ones: 2, twos: 5, threes: 8, fours: 11, fives: 14, sixes: 17, threeKind: 20, fourKind: 12, fullHouse: 20, smallStraight: 26, largeStraight: 28, fahtzee: 14, chance: 22 };
const MINDS = {
  1: { ahead: 1, par: 0.5, pace: 0, lands: 0 },
  // pace: each pip above or below three of a face while the bonus is live; lands: the score that secures it
  2: { ahead: 2, par: 1, pace: 1, lands: 15 },
};

const lookValue = (dice, scores, mind) => {
  const need = 63 - UPPER_KEYS.reduce((a, k) => a + (scores[k] ?? 0), 0);
  const reach = UPPER_KEYS.reduce((a, k, i) => a + (scores[k] === undefined ? 5 * (i + 1) : 0), 0);
  const bonusLive = need > 0 && reach >= need;
  const joker = jokerOn(dice, scores);
  let best = -Infinity, bestKey = null;
  for (const key of ALL_KEYS) {
    if (scores[key] !== undefined) continue;
    const s = pays(key, dice, scores);
    let v = s - mind.par * PAR[key];
    const ui = UPPER_KEYS.indexOf(key);
    if (ui >= 0 && bonusLive) {
      v += mind.pace * (s - 3 * (ui + 1));
      if (s >= need) v += mind.lands;
    }
    if (joker && key !== "fahtzee") v += 100;
    if (v > best) { best = v; bestKey = key; }
  }
  return [best, bestKey];
};

let LA = null; // lazily built: hands, keeps, and how each keep rolls into hands
const lookTables = () => {
  if (LA) return LA;
  const enc = (c) => c.reduce((a, n, i) => a + n * 6 ** i, 0);
  const bySize = [];
  for (let k = 0; k <= 5; k++) {
    const m = new Map();
    const rec = (n, c) => {
      if (n === 0) { const e = m.get(enc(c)); if (e) e[1]++; else m.set(enc(c), [[...c], 1]); return; }
      for (let f = 0; f < 6; f++) { c[f]++; rec(n - 1, c); c[f]--; }
    };
    rec(k, [0, 0, 0, 0, 0, 0]);
    bySize.push([...m.values()].map(([c, n]) => [c, n / 6 ** k]));
  }
  const hands = bySize[5].map(([c]) => c);
  const handIdx = new Map(hands.map((c, i) => [enc(c), i]));
  const keeps = bySize.flatMap((s) => s.map(([c]) => c));
  const keepIdx = new Map(keeps.map((c, i) => [enc(c), i]));
  const rolls = keeps.map((k) => {
    const n = k.reduce((a, b) => a + b, 0);
    return bySize[5 - n].map(([o, p]) => [handIdx.get(enc(k.map((x, i) => x + o[i]))), p]);
  });
  const subKeeps = hands.map((c) => {
    const out = [];
    const rec = (i, s) => {
      if (i === 6) { out.push(keepIdx.get(enc(s))); return; }
      for (let n = 0; n <= c[i]; n++) { s[i] = n; rec(i + 1, s); }
      s[i] = 0;
    };
    rec(0, [0, 0, 0, 0, 0, 0]);
    return out;
  });
  const handDice = hands.map((c) => c.flatMap((n, i) => Array(n).fill(i + 1)));
  LA = { enc, handIdx, keeps, rolls, subKeeps, handDice, sig: null, E: null };
  return LA;
};

// What each keep is worth with one and two rolls to come, for this scorecard and mind
const keepValues = (scores, level) => {
  const t = lookTables();
  const sig = level + ":" + ALL_KEYS.map((k) => scores[k] ?? "_").join(",");
  if (t.sig === sig) return t.E;
  const average = (V) => t.rolls.map((r) => r.reduce((a, [h, p]) => a + p * V[h], 0));
  const V0 = t.handDice.map((d) => lookValue(d, scores, MINDS[level])[0]);
  const E1 = average(V0);
  const V1 = t.subKeeps.map((ks) => Math.max(...ks.map((k) => E1[k])));
  t.sig = sig;
  t.E = { 1: E1, 2: average(V1) };
  return t.E;
};

// The best keep from these dice with this many rolls left, as counts per face
const lookKeep = (dice, scores, level, rollsLeft) => {
  const t = lookTables();
  const E = keepValues(scores, level)[Math.max(1, Math.min(MINDS[level].ahead, rollsLeft))];
  let best = null, bv = -Infinity;
  for (const k of t.subKeeps[t.handIdx.get(t.enc(counts(dice)))]) if (E[k] > bv + 1e-9) { bv = E[k]; best = k; }
  return t.keeps[best];
};

// ---------- What the turn engine calls ----------
// rollsLeft is how many rolls remain after the one just thrown (2 after the first)

export const botChooseHolds = (dice, scores, level = 1, rollsLeft = 2) => {
  if (!MINDS[level]) return easyHolds(dice, scores);
  const keep = [...lookKeep(dice, scores, level, rollsLeft)];
  return dice.map((d) => (keep[d - 1] > 0 ? (keep[d - 1]--, true) : false));
};

export const botShouldStop = (dice, scores, level = 1, rollsLeft = 2) => {
  if (!MINDS[level]) return easyStop(dice, scores);
  return lookKeep(dice, scores, level, rollsLeft).reduce((a, b) => a + b, 0) === 5;
};

export const botChooseCategory = (dice, scores, level = 1) =>
  MINDS[level] ? lookValue(dice, scores, MINDS[level])[1] : easyCategory(dice, scores);
