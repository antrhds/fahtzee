// The AI's three levels. Part one plays thousands of solo turns straight from src/ai.js
// with seeded dice, so the averages are reproducible: each level must land in its band
// and in order, and a handful of decisions that used to go wrong must now go right.
// Part two drives the BUILT index.html: each level plays a real turn without errors.
//   node test/ai.js            (N=games per level, default 300)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

process.removeAllListeners("warning"); // src/ is ESM in a CommonJS package: Node says so, at length
const src = (f) => import(pathToFileURL(path.join(__dirname, "..", "src", f)).href);
const PAGE = "file://" + path.join(__dirname, "..", "index.html");
const findChromium = () =>
  [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && fs.existsSync(p));

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    console.log("        ", detail);
  }
};

// mulberry32: small, seedable, good enough for dice
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

(async () => {
  const { counts, SCORERS, totalsFor } = await src("logic.js");
  const { botChooseHolds, botChooseCategory, botShouldStop } = await src("ai.js");

  // One solo game, scored exactly as the app scores it (joker values, 100 bonus)
  const game = (level) => {
    const p = { scores: {}, yahtzeeBonuses: 0 };
    const die = () => 1 + Math.floor(Math.random() * 6);
    for (let t = 0; t < 13; t++) {
      let held = [false, false, false, false, false], dice = [0, 0, 0, 0, 0];
      for (let r = 0; r < 3; r++) {
        dice = dice.map((d, i) => (held[i] ? d : die()));
        if (r === 2 || botShouldStop(dice, p.scores, level, 2 - r)) break;
        held = botChooseHolds(dice, p.scores, level, 2 - r);
      }
      const key = botChooseCategory(dice, p.scores, level);
      if (p.scores[key] !== undefined) throw new Error(`level ${level} chose a used box: ${key}`);
      let pts = SCORERS[key](dice);
      if (counts(dice).some((c) => c === 5) && p.scores.fahtzee === 50 && key !== "fahtzee") {
        p.yahtzeeBonuses++;
        pts = { fullHouse: 25, smallStraight: 30, largeStraight: 40 }[key] ?? pts;
      }
      p.scores[key] = pts;
    }
    return totalsFor(p).grand;
  };

  const N = +process.env.N || 300;
  const realRandom = Math.random;
  const mean = {};
  console.log(`\n[1] ${N} solo games per level, seeded`);
  for (const level of [0, 1, 2]) {
    Math.random = seeded(1000 + level);
    let sum = 0;
    const t0 = Date.now();
    for (let i = 0; i < N; i++) sum += game(level);
    mean[level] = sum / N;
    console.log(`        level ${level}: mean ${mean[level].toFixed(1)}  (${((Date.now() - t0) / N / 13).toFixed(1)} ms a turn)`);
  }
  Math.random = realRandom;
  check("Easy averages 145 to 180 (was 143 before v2.18)", mean[0] >= 145 && mean[0] <= 180, mean[0]);
  check("Normal averages 215 to 240 (was 209)", mean[1] >= 215 && mean[1] <= 240, mean[1]);
  check("Ruthless averages 235 or more (was 211)", mean[2] >= 235, mean[2]);
  check("and they are in order, with daylight between", mean[2] - mean[1] >= 8 && mean[1] - mean[0] >= 40, JSON.stringify(mean));

  console.log("\n[2] decisions that used to go wrong");
  for (const level of [1, 2]) {
    const name = level === 1 ? "Normal" : "Ruthless";
    const four = [6, 6, 6, 6, 2];
    check(`${name} rolls on from four of a kind while the Fahtzee box is open`,
      !botShouldStop(four, {}, level, 1) && botChooseHolds(four, {}, level, 1).join() === "true,true,true,true,false");
    check(`${name} puts a second Fahtzee of ones in Large Straight, for 40 and the bonus`,
      botChooseCategory([1, 1, 1, 1, 1], { fahtzee: 50 }, level) === "largeStraight",
      botChooseCategory([1, 1, 1, 1, 1], { fahtzee: 50 }, level));
    check(`${name} stops on a Fahtzee rather than rattling five held dice`, botShouldStop([4, 4, 4, 4, 4], { fahtzee: 50 }, level, 2));
  }
  check("Ruthless keeps three sixes on the first roll", botChooseHolds([6, 1, 6, 2, 6], {}, 2, 2).join() === "true,false,true,false,true",
    botChooseHolds([6, 1, 6, 2, 6], {}, 2, 2));
  check("Ruthless does not waste Sixes on two of them", botChooseCategory([6, 6, 1, 2, 4], {}, 2) !== "sixes");
  const late = { ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, threeKind: 20, fourKind: 20, fullHouse: 25, smallStraight: 30, largeStraight: 40, fahtzee: 0 };
  check("Ruthless, with only Sixes and Chance left, keeps the sixes", botChooseHolds([6, 6, 1, 2, 3], late, 2, 2).join() === "true,true,false,false,false",
    botChooseHolds([6, 6, 1, 2, 3], late, 2, 2));
  check("Easy keeps a large straight it has already rolled", botShouldStop([2, 3, 4, 5, 6], {}, 0, 2));
  check("Easy keeps a full house", botShouldStop([3, 3, 3, 5, 5], {}, 0, 2));
  check("Easy still burns its rolls on nothing much", !botShouldStop([1, 1, 3, 5, 6], {}, 0, 2));

  // Part two: the built game
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  console.log("\n[3] each level plays a real turn in the built game");
  for (const level of [0, 1, 2]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((lv) => {
      localStorage.setItem("fahtzee-current-game", JSON.stringify({
        v: 2, savedAt: Date.now(), current: 0, round: 1, dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: 3,
        players: [
          { name: "AI", colour: "#4CC9F0", scores: {}, yahtzeeBonuses: 0, isBot: true, level: lv },
          { name: "Tony", colour: "#FF5A5F", scores: {}, yahtzeeBonuses: 0, isBot: false },
        ],
      }));
      sessionStorage.setItem("fahtzee-splash-seen", "1");
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
      Object.defineProperty(window, "speechSynthesis", { value: { speak() {}, cancel() {}, getVoices: () => [] } });
    }, level);
    await page.goto(PAGE);
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Resume/i }).first().click();
    let g = null;
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(200);
      g = await page.evaluate(() => JSON.parse(localStorage.getItem("fahtzee-current-game") || "null"));
      if (g && g.current === 1) break;
    }
    const banked = g && Object.entries(g.players[0].scores);
    check(`level ${level} banks a score and hands over`, g && g.current === 1 && banked.length === 1, JSON.stringify(g && g.players[0].scores));
    check(`level ${level}: no page errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  await browser.close();

  console.log(failures ? `\n${failures} failure(s)` : "\nAll AI checks pass");
  process.exit(failures ? 1 : 0);
})();
