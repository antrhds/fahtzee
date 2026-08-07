// Fahtzee game logic: scoring, categories, totals

// ---------- Scoring logic ----------
export const counts = (dice) => {
  const c = [0, 0, 0, 0, 0, 0];
  dice.forEach((d) => c[d - 1]++);
  return c;
};
export const sum = (dice) => dice.reduce((a, b) => a + b, 0);

export const SCORERS = {
  ones: (d) => counts(d)[0] * 1,
  twos: (d) => counts(d)[1] * 2,
  threes: (d) => counts(d)[2] * 3,
  fours: (d) => counts(d)[3] * 4,
  fives: (d) => counts(d)[4] * 5,
  sixes: (d) => counts(d)[5] * 6,
  threeKind: (d) => (counts(d).some((c) => c >= 3) ? sum(d) : 0),
  fourKind: (d) => (counts(d).some((c) => c >= 4) ? sum(d) : 0),
  fullHouse: (d) => {
    const c = counts(d).filter((x) => x > 0).sort();
    return (c.length === 2 && c[0] === 2 && c[1] === 3) || counts(d).some((x) => x === 5) ? 25 : 0;
  },
  smallStraight: (d) => {
    const s = new Set(d);
    const runs = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
    return runs.some((r) => r.every((n) => s.has(n))) ? 30 : 0;
  },
  largeStraight: (d) => {
    const s = [...new Set(d)].sort().join("");
    return s === "12345" || s === "23456" ? 40 : 0;
  },
  fahtzee: (d) => (counts(d).some((c) => c === 5) ? 50 : 0),
  chance: (d) => sum(d),
};

export const UPPER = [
  { key: "ones", label: "Ones" },
  { key: "twos", label: "Twos" },
  { key: "threes", label: "Threes" },
  { key: "fours", label: "Fours" },
  { key: "fives", label: "Fives" },
  { key: "sixes", label: "Sixes" },
];
export const LOWER = [
  { key: "threeKind", label: "3 of a Kind" },
  { key: "fourKind", label: "4 of a Kind" },
  { key: "fullHouse", label: "Full House" },
  { key: "smallStraight", label: "Sm Straight" },
  { key: "largeStraight", label: "Lg Straight" },
  { key: "fahtzee", label: "FAHTZEE" },
  { key: "chance", label: "Chance" },
];


export const UPPER_KEYS = ["ones", "twos", "threes", "fours", "fives", "sixes"];

export const totalsFor = (p) => {
  const upperSum = UPPER.reduce((a, { key }) => a + (p.scores[key] ?? 0), 0);
  const upperBonus = upperSum >= 63 ? 35 : 0;
  const lowerSum = LOWER.reduce((a, { key }) => a + (p.scores[key] ?? 0), 0);
  return {
    upperSum,
    upperBonus,
    lowerSum,
    grand: upperSum + upperBonus + lowerSum + p.yahtzeeBonuses * 100,
  };
};


