// The AI's brain, now with three difficulty levels: 0 easy, 1 normal, 2 ruthless
import { counts, SCORERS, UPPER, LOWER, UPPER_KEYS } from "./logic.js";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const longestRun = (dice) => {
  const uniq = [...new Set(dice)].sort((a, b) => a - b);
  let best = [], run = [uniq[0]];
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] + 1) run.push(uniq[i]);
    else { if (run.length > best.length) best = run; run = [uniq[i]]; }
  }
  return run.length > best.length ? run : best;
};

export const botChooseHolds = (dice, scores, level = 1) => {
  const c = counts(dice);
  const maxCount = Math.max(...c);
  let face = 6, bc = 0;
  for (let f = 6; f >= 1; f--) if (c[f - 1] > bc) { bc = c[f - 1]; face = f; }

  if (level === 0) {
    // Easy: hold a pair if it has one, otherwise reroll the lot
    if (bc >= 2) return dice.map((d) => d === face);
    return [false, false, false, false, false];
  }

  const run = longestRun(dice);
  const straightOpen = scores.largeStraight === undefined || scores.smallStraight === undefined;

  if (level === 2) {
    // Ruthless: protect a Fahtzee hunt above all
    if (scores.fahtzee === undefined && bc >= 3) return dice.map((d) => d === face);
    // Two pairs with full house open: keep both
    if (scores.fullHouse === undefined) {
      const pairs = [];
      c.forEach((n, i) => { if (n >= 2) pairs.push(i + 1); });
      if (pairs.length >= 2) return dice.map((d) => pairs.includes(d));
    }
    // A four-run with a straight open beats any pair
    if (straightOpen && run.length >= 4) {
      const holds = [false, false, false, false, false];
      const needed = new Set(run);
      dice.forEach((d, i) => { if (needed.has(d)) { holds[i] = true; needed.delete(d); } });
      return holds;
    }
  }

  // Chase a straight when 3+ in a row and no strong pair
  if (straightOpen && run.length >= 3 && maxCount <= 2) {
    const holds = [false, false, false, false, false];
    const needed = new Set(run);
    dice.forEach((d, i) => { if (needed.has(d)) { holds[i] = true; needed.delete(d); } });
    return holds;
  }
  if (bc >= 2) return dice.map((d) => d === face);
  return dice.map((d) => d >= 5);
};

export const botChooseCategory = (dice, scores, level = 1) => {
  const open = [...UPPER, ...LOWER].filter((cat) => scores[cat.key] === undefined);
  const scored = open.map((cat) => {
    let v = SCORERS[cat.key](dice);
    if (level > 0) {
      if (UPPER_KEYS.includes(cat.key)) {
        const face = UPPER_KEYS.indexOf(cat.key) + 1;
        if (v >= face * 3) v += level === 2 ? 6 : 4; // on pace for the bonus
      }
      if (v === 0) {
        if (cat.key === "fahtzee") v = -9;
        else if (cat.key === "largeStraight") v = -7;
        else if (cat.key === "fourKind") v = -5;
        else if (cat.key === "smallStraight" || cat.key === "fullHouse") v = -4;
        else v = -UPPER_KEYS.indexOf(cat.key);
      }
      if (cat.key === "chance") v -= level === 2 && SCORERS.chance(dice) < 18 ? 8 : 4;
    }
    return { key: cat.key, v };
  });
  scored.sort((a, b) => b.v - a.v);
  // Easy sometimes takes the second-best option, because it is not paying attention
  if (level === 0 && scored.length > 1 && Math.random() < 0.35 && scored[1].v > 0) return scored[1].key;
  return scored[0].key;
};

export const botShouldStop = (dice, scores, level = 1) => {
  if (level === 0) return false; // Easy always burns all three rolls
  const open = new Set([...UPPER, ...LOWER].filter((c) => scores[c.key] === undefined).map((c) => c.key));
  if (open.has("fahtzee") && SCORERS.fahtzee(dice) === 50) return true;
  if (open.has("largeStraight") && SCORERS.largeStraight(dice) === 40) return true;
  if (open.has("fullHouse") && SCORERS.fullHouse(dice) === 25) return true;
  if (open.has("fourKind") && SCORERS.fourKind(dice) >= 22) return true;
  if (level === 2 && open.has("smallStraight") && !open.has("largeStraight") && SCORERS.smallStraight(dice) === 30) return true;
  return false;
};
