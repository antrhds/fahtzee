// Fahtzee's script: the announcer's random lines. One is picked at random each time.
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// "and" list: "Jo, Max and Sam"
export const nameList = (names) =>
  names.length <= 1 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

export const SOLO_WIN = [
  (n) => `Congratulations, ${n}. The machines never stood a chance.`,
  (n) => `${n} wins! Humanity's honour is restored.`,
  (n) => `Victory for ${n}. The AI would like a rematch. It has no choice, really.`,
  (n) => `Congratulations, ${n}. Somewhere, a server is sulking.`,
  (n) => `${n} takes it! Beaten by flesh and luck.`,
  (n) => `Well played, ${n}. The AI is pretending it let you win.`,
  (n) => `${n} wins. The robot uprising has been postponed.`,
  (n) => `Congratulations, ${n}. Carbon one, silicon nil.`,
];

export const SOLO_LOSS = [
  (n) => `Better luck next time, ${n}.`,
  (n) => `The AI wins. Chin up, ${n}, it doesn't even enjoy it.`,
  (n) => `Hard lines, ${n}. The dice have no loyalty.`,
  (n) => `The machine takes it. ${n}, it was the dice, not you. Probably.`,
  (n) => `Defeat, ${n}. The AI will not be gracious about this.`,
  (n) => `Better luck next time, ${n}. The AI says: good game. It is lying.`,
  (n) => `The AI wins again. ${n}, perhaps try shaking harder.`,
  (n) => `Unlucky, ${n}. Even the announcer was rooting for you.`,
];

export const LOCAL_WIN = [
  (w, l) => `Congratulations, ${w}! Commiserations to ${l}.`,
  (w, l) => `${w} takes the crown. ${l}, the washing up awaits.`,
  (w, l) => `Victory for ${w}! ${l}, you were all very much present.`,
  (w, l) => `${w} wins! ${l}, form an orderly queue for excuses.`,
  (w, l) => `All hail ${w}. Deepest sympathies to ${l}.`,
  (w, l) => `${w} is the champion. ${l}, the dice have spoken and they were rude.`,
  (w, l) => `Congratulations, ${w}. As for ${l}, there is always next time. Probably.`,
  (w, l) => `${w} wins it! ${l}, please clap.`,
];

export const AI_WINS_LOCAL = [
  (l) => `The AI wins. ${l}, you were beaten by a handful of if statements.`,
  (l) => `Victory for the machine. Better luck next time, ${l}.`,
  (l) => `The AI takes it. ${l}, it says nothing personal. It means everything personal.`,
  (l) => `The machine triumphs. ${l}, do give it a moment to gloat.`,
  (l) => `The AI wins. ${l}, the good news is it cannot celebrate.`,
];

// ---------- The Stats panel's narrative lines ----------
// Games needed between two players before it counts as a rivalry
export const RIVALRY_MIN = 5;

// n is the current run: positive won, negative lost. Nothing to say below two.
export const streakLine = (name, n) => {
  const c = Math.abs(n);
  if (c < 2) return null;
  if (n > 0) {
    if (c === 2) return `${name} has won two on the trot`;
    if (c <= 4) return `${name} has won ${c} on the bounce`;
    if (c <= 6) return `${name} has won ${c} in a row. Someone check the dice`;
    return `${name} has won ${c} straight. This is now a formality`;
  }
  if (c === 2) return `${name} has lost two in a row, which they are handling well`;
  if (c <= 4) return `${name} has lost ${c} on the bounce, which they are handling well`;
  return `${name} has lost ${c} straight. They are handling it well`;
};

export const rivalryLine = (a, aWins, b, bWins) => {
  if (aWins === bWins) return `${a} and ${b} are level, ${aWins} apiece`;
  const lead = aWins > bWins ? a : b;
  const trail = aWins > bWins ? b : a;
  const hi = Math.max(aWins, bWins);
  const lo = Math.min(aWins, bWins);
  if (hi - lo === 1) return `${lead} leads ${trail} ${hi} to ${lo}, and mentions it often`;
  return `${lead} leads ${trail} ${hi} to ${lo}`;
};

export const bestLine = (name, score) =>
  score >= 300
    ? `Best ever: ${score}, by ${name}, who still brings it up`
    : `Best ever: ${score}, by ${name}`;

// The AI's table talk
export const AI_SMUG = [
  "Lovely.",
  "Too easy.",
  "As calculated.",
  "Delicious.",
  "You may applaud.",
  "Textbook.",
];

export const AI_GRUDGING = [
  "Impossible.",
  "Recalculating.",
  "Hm. Impressive.",
  "Lucky roll.",
  "I demand a scan of those dice.",
];
