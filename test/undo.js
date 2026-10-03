// Undo is for a fat thumb, not a second go. The undo button must vanish the moment
// the next turn's first roll is thrown (otherwise: roll three times, dislike it,
// undo the previous player's score, have them bank it again, start afresh), and
// once a roll-off has begun. Undoing the game's final score must take the
// recorded game back off the books, so re-banking it does not count it twice.
//   node test/undo.js
// Playwright against the built index.html, at Tony's phone size. The dice are
// loaded by replacing Math.random before the page boots: every roll lands 1 2 3 4 6.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "..", "index.html");
const findChromium = () =>
  [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && fs.existsSync(p));
const SKINS = ["dark", "light", "comic", "sweets", "neon", "casino", "resistance"];

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    console.log("        ", detail);
  }
};

// Everything but Chance, so one more score each ends the game
const card = (threeKind) => ({
  ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
  threeKind, fourKind: 0, fullHouse: 25, smallStraight: 30, largeStraight: 0, fahtzee: 0,
});
const player = (name, colour, scores) => ({ name, colour, scores, yahtzeeBonuses: 0, isBot: false });
const fresh = {
  players: [player("Tony", "#FF5A5F", {}), player("Ann", "#B388FF", {})],
  current: 0, round: 1,
};
// Tony has finished on 193. Ann banks Chance (1+2+3+4+6 = 16) last: 189 loses, 193 ties
const finale = (annThreeKind) => ({
  players: [player("Tony", "#FF5A5F", { ...card(20), chance: 20 }), player("Ann", "#B388FF", card(annThreeKind))],
  current: 1, round: 13,
});

const open = async (browser, g, skin = "dark") => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = { v: 2, savedAt: Date.now(), dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: 3, ...g };
  await page.addInitScript(([s, sk]) => {
    localStorage.setItem("fahtzee-current-game", JSON.stringify(s));
    localStorage.setItem("fahtzee-skin", sk);
    sessionStorage.setItem("fahtzee-splash-seen", "1");
    let i = 0;
    Math.random = () => [0.05, 0.25, 0.45, 0.65, 0.85][i++ % 5];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    Object.defineProperty(window, "speechSynthesis", { value: { speak() {}, cancel() {}, getVoices: () => [] } });
  }, [saved, skin]);
  await page.goto(PAGE);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Resume/i }).first().click();
  await page.waitForTimeout(400);
  return { ctx, page, errors };
};
const click = async (page, re) => {
  await page.locator("button:not([disabled])", { hasText: re }).first().click();
  await page.waitForTimeout(450);
};
const ready = (page) => click(page, /I'M READY/i);
const roll = async (page) => { await click(page, /^Roll/i); await page.waitForTimeout(250); };
const undoShown = async (page) => (await page.locator("button", { hasText: /Undo .* last score/ }).count()) > 0;
const books = (page) => page.evaluate(() => ({
  history: JSON.parse(localStorage.getItem("fahtzee-history") || "[]").length,
  played: ((JSON.parse(localStorage.getItem("fahtzee-tally") || "null") || { players: {} }).players.Ann || {}).played || 0,
}));

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  // 1. The cheat, in every skin (Comic and Sweet Shop use the board playing screen)
  for (const skin of SKINS) {
    console.log(`\n[1] ${skin}: the undo goes with the next turn's first roll`);
    const { ctx, page, errors } = await open(browser, fresh, skin);
    await ready(page);
    check("no undo before anyone has scored", !(await undoShown(page)));
    await roll(page);
    await click(page, /Chance/);
    check("Tony's score can be undone at the handoff", await undoShown(page));
    await ready(page);
    check("and on Ann's turn before she rolls", await undoShown(page));
    await roll(page);
    check("gone after Ann's first roll", !(await undoShown(page)));
    await roll(page);
    await roll(page);
    check("still gone after her third", !(await undoShown(page)));
    await click(page, /Chance/);
    check("Ann's score can be undone in turn", await undoShown(page));
    check("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 2. Undoing the final score does not count the game twice
  console.log("\n[2] the final score, undone and banked again, is recorded once");
  {
    const { ctx, page, errors } = await open(browser, finale(20));
    await ready(page);
    await roll(page);
    await click(page, /Chance/);
    await page.waitForTimeout(400);
    let b = await books(page);
    check("the game is recorded", b.history === 1 && b.played === 1, JSON.stringify(b));
    check("the last score can still be undone", await undoShown(page));
    await click(page, /Undo .* last score/);
    b = await books(page);
    check("undo takes it back off the books", b.history === 0 && b.played === 0, JSON.stringify(b));
    await click(page, /Chance/);
    await page.waitForTimeout(400);
    b = await books(page);
    check("banked again, it is recorded once", b.history === 1 && b.played === 1, JSON.stringify(b));
    check("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 3. A roll-off cannot be restarted by undoing the score that tied it
  console.log("\n[3] the undo goes once the roll-off starts rolling");
  {
    const { ctx, page, errors } = await open(browser, finale(24));
    await ready(page);
    await roll(page);
    await click(page, /Chance/);
    check("it is a tie", (await page.locator("text=Tie at the top").count()) > 0);
    check("the tying score can be undone", await undoShown(page));
    await click(page, /Start Roll-Off/);
    check("still, before anyone rolls off", await undoShown(page));
    await click(page, /Roll 1 of 3/);
    await page.waitForTimeout(300);
    check("gone after the first roll-off roll", !(await undoShown(page)));
    check("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} failure(s)` : "\nAll undo checks pass");
  process.exit(failures ? 1 : 0);
})();
