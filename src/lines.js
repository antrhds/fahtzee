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

// ---------- We have dice: one card, the friends' totals typed in at the end ----------
const by = (n) => `${n} point${n === 1 ? "" : "s"}`;
// (me, margin, runnerUp)
export const CARD_WIN = [
  (n, m, r) => `${n} wins by ${by(m)}. ${r} is checking the arithmetic. ${r} may be some time.`,
  (n, m, r) => `Congratulations, ${n}. Ahead of ${r} by ${by(m)}, and the phone did the adding up, so no appeals.`,
  (n, m, r) => `${n} wins. ${r}, ${by(m)} short. The dice were real, and so is the defeat.`,
  (n, m, r) => `Victory for ${n}, by ${by(m)}. ${r} would like it noted that they had a bad round seven.`,
];
// (me, winner, margin)
export const CARD_LOSS = [
  (n, w, m) => `${w} wins. ${n}, ${by(m)} adrift. Real dice, real disappointment.`,
  (n, w, m) => `Hard lines, ${n}. ${w} takes it by ${by(m)}. Do check their arithmetic, quietly.`,
  (n, w, m) => `${w} wins, by ${by(m)}. ${n}, the phone only counts them, it cannot help you roll them.`,
  (n, w, m) => `Not tonight, ${n}. ${w} is ${by(m)} better and will be mentioning it.`,
];
// (me, the rest at the top)
export const CARD_TIE = [
  (n, o) => `Dead level. ${n} and ${o} share it. Nobody is happy about this.`,
  (n, o) => `A tie. ${n} and ${o} take a share each, and the argument continues.`,
];
// (me, total): nobody else's score typed in
export const CARD_ALONE = [
  (n, t) => `${n} scores ${t}. With nobody to beat it goes down as a score, not a win.`,
  (n, t) => `${n} scores ${t}, against nobody in particular. Noted all the same.`,
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

// ---------- Milestones: 50, 100, 250, 500 games, then every 500 after ----------
export const isMilestone = (played) =>
  played === 50 || played === 100 || played === 250 || (played >= 500 && played % 500 === 0);

// Under the big number. n is the milestone, names an "and" list.
export const MILESTONE_CAPTION = [
  (names, n) => `That is ${(n * 13).toLocaleString("en-GB")} turns, and every bad one was the dice's fault.`,
  (names, n) => `${n} games. Somebody fetch a cake. Or at least a biscuit.`,
  (names, n) => `${n} games, and not one of them wasted. Well, a few.`,
  (names, n) => `The dice would like to say a few words. They cannot, so here are some fireworks.`,
];
export const MILESTONE_CAPTION_AI = [
  (n) => `${n} games, and the AI has not once asked for a cup of tea.`,
  (n) => `${n} games. The AI has not aged a day, and would like that noted.`,
  (n) => `The AI has played ${n} games. It is not tired. It does not know how.`,
];

// What the announcer says once it lands
export const MILESTONE_SAY = [
  (names, n) => `Game ${n} for ${names}. Please clap.`,
  (names, n) => `Ladies and gentlemen, that was game ${n} for ${names}. Fireworks, please.`,
  (names, n) => `${names}. ${n} games. That is either dedication or a cry for help.`,
];
export const MILESTONE_SAY_AI = [
  (n) => `${n} games. I have not aged a day.`,
  (n) => `That is ${n} games for me. I will be accepting applause, and nothing else.`,
];

// Every milestone a player has passed, oldest first, and the next one up
export const milestonesUpTo = (played) => {
  const out = [50, 100, 250].filter((m) => m <= played);
  for (let m = 500; m <= played; m += 500) out.push(m);
  return out;
};
export const nextMilestone = (played) =>
  [50, 100, 250].find((m) => m > played) || (Math.floor(played / 500) + 1) * 500;

// ---------- The Fahtzee cut-scene ----------
// Under the word. face is what was rolled (1-6).
export const FACE_WORDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];
export const SCENE_SUB = [
  (f) => `Five ${f}. No arguing with that.`,
  (f) => `Five ${f}. Somebody check the dice.`,
  (f) => `Five ${f}. Please clap.`,
  (f) => `Five ${f}. Act natural.`,
  (f) => `Five ${f}. The dice have chosen.`,
];
export const SCENE_SUB_AI = [
  (f) => `Five ${f}. As calculated.`,
  (f) => `Five ${f}. You may applaud.`,
  (f) => `Five ${f}. It would like that minuted.`,
];
