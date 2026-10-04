// We have Dice (v3.0): the phone keeps the card while real dice do the rolling.
// Tap a box, tap the five faces showing, bank. One name is your own card, finished by
// typing in friends' totals; two to four are one phone for the table. Also the house
// rules: what each extra Fahtzee is worth, offered everywhere but against the AI.
//   node test/real-dice.js          (SHOTS=dir saves screenshots)
// Playwright against the built index.html, at Tony's phone size.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "..", "index.html");
const findChromium = () =>
  [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && fs.existsSync(p));
const SKINS = ["dark", "light", "comic", "sweets", "neon", "casino", "resistance"];
const SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    console.log("        ", detail);
  }
};

const player = (name, colour, scores, yahtzeeBonuses = 0) => ({ name, colour, scores, yahtzeeBonuses, isBot: false });
// Everything but Chance: 3+6+9+12+15+18 = 63 (bonus 35), lower 20+0+25+30+0+0 = 75. 173 before Chance
const allButChance = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, threeKind: 20, fourKind: 0, fullHouse: 25, smallStraight: 30, largeStraight: 0, fahtzee: 0 };
const diceGame = (players, extra = 100) => ({
  v: 2, savedAt: Date.now(), players, current: 0, round: 1,
  dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: 3, mode: "dice", extraFahtzee: extra,
});

const open = async (browser, { skin = "dark", saved = null, lobby = null, said = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 727 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(([s, sk, lb]) => {
    if (s) localStorage.setItem("fahtzee-current-game", JSON.stringify(s));
    if (lb) localStorage.setItem("fahtzee-lobby", JSON.stringify(lb));
    localStorage.setItem("fahtzee-skin", sk);
    sessionStorage.setItem("fahtzee-splash-seen", "1");
    window.__said = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    Object.defineProperty(window, "speechSynthesis", { value: { speak(u) { window.__said.push(u.text); }, cancel() {}, getVoices: () => [] } });
  }, [saved, skin, lobby]);
  await page.goto(PAGE);
  await page.waitForTimeout(500);
  if (saved) {
    await page.getByRole("button", { name: /Resume/i }).first().click();
    await page.waitForTimeout(300);
  }
  return { ctx, page, errors };
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const store = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);
const text = (page) => page.evaluate(() => document.body.innerText);
const tapFaces = async (page, faces) => {
  for (const f of faces) await page.getByRole("button", { name: `Die showing ${f}`, exact: false }).first().click();
};
const bankBtn = (page) => page.locator("button", { hasText: /^(Bank |Pick a box|\d more di)/i }).first();
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true }); };

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium() });

  console.log("Lobby: the mode switch and house rules, every skin");
  for (const skin of SKINS) {
    const { ctx, page, errors } = await open(browser, { skin });
    await page.getByRole("button", { name: /We have Dice/ }).click();
    await page.getByRole("switch", { name: /Standard rules/ }).click();
    await page.waitForTimeout(150);
    const t = await text(page);
    const ai = await page.getByRole("button", { name: /Add AI/ }).count();
    check(`${skin}: no AI, house rules with the extra Fahtzee chips, no overflow`,
      ai === 0 && /Each extra Fahtzee is worth/.test(t) && (await overflow(page)) <= 0 && !errors.length,
      { ai, overflow: await overflow(page), errors });
    if (skin === "dark") await shot(page, "lobby-dice");
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser);
    const before = await page.locator("[data-house-rules]").count();
    await page.getByRole("button", { name: /Add AI/ }).click();
    const after = await page.locator("[data-house-rules]").count();
    check("pass and play shows house rules, and hides them once the AI is drafted in", before === 1 && after === 0, { before, after });
    await page.getByRole("button", { name: /We have Dice/ }).click();
    await page.reload();
    await page.waitForTimeout(400);
    check("the lobby remembers We have Dice was chosen", (await store(page, "fahtzee-lobby")).mode === "dice" && /Your name/.test(await page.locator("input").first().getAttribute("placeholder")));
    await ctx.close();
  }

  console.log("Your card: tap a box, tap the dice, bank");
  {
    const { ctx, page, errors } = await open(browser, { lobby: { mode: "dice", standard: true, extra: 50 } });
    await page.locator("input").first().fill("Tony");
    await page.getByRole("button", { name: "Let's Go" }).click();
    await page.waitForTimeout(200);
    check("one name starts a card of your own", /Tony/.test(await text(page)) && (await page.locator("[data-card]").count()) === 1);
    await page.getByRole("button", { name: "Full House", exact: true }).click();
    await tapFaces(page, [3, 3, 5, 5, 5]);
    check("five taps make a Full House worth 25", (await bankBtn(page).innerText()).trim().replace(/\s+/g, " ").toLowerCase() === "bank 25 in full house", await bankBtn(page).innerText());
    const dots = await page.locator('[aria-label="2 tapped"], [aria-label="3 tapped"]').count();
    check("counter dots show the 3 tapped twice and the 5 three times", dots === 2, dots);
    await shot(page, "card-solo");
    await page.getByRole("button", { name: /Undo/ }).click();
    check("undo takes back the last die tapped", /1 more die/i.test(await bankBtn(page).innerText()), await bankBtn(page).innerText());
    await tapFaces(page, [6]);
    check("after five taps the dice stop taking more", await page.getByRole("button", { name: "Die showing 1" }).first().isDisabled());
    check("a full house with a six in it is worth nothing", /Bank 0 in Full House/i.test(await bankBtn(page).innerText()), await bankBtn(page).innerText());
    await page.getByRole("button", { name: /Undo/ }).click();
    await tapFaces(page, [5]);
    await bankBtn(page).click();
    await page.waitForTimeout(200);
    const saved = await store(page, "fahtzee-current-game");
    check("banking fills the box and saves the card", saved && saved.mode === "dice" && saved.players[0].scores.fullHouse === 25, saved);
    await page.getByRole("button", { name: /Undo/ }).click();
    await page.waitForTimeout(200);
    const after = await store(page, "fahtzee-current-game");
    check("with no dice tapped, undo takes the banked score back", after.players[0].scores.fullHouse === undefined, after.players[0].scores);
    check("no page errors", !errors.length, errors);
    await ctx.close();
  }

  console.log("Every skin: the card alone and at a table of four, at 360px");
  for (const skin of SKINS) {
    for (const ps of [[player("Bartholomew", "#FF5A5F", { sixes: 24 })],
      [player("Bartholomew", "#FF5A5F", { sixes: 24 }), player("Ann", "#4CC9F0", {}), player("Jo", "#FFA62B", { chance: 22 }), player("Mum", "#80ED99", {})]]) {
      const { ctx, page, errors } = await open(browser, { skin, saved: diceGame(ps) });
      const label = ps.length === 1 ? "Sm Straight" : "Bartholomew, Sm Straight";
      await page.getByRole("button", { name: label, exact: true }).click();
      await tapFaces(page, [2, 3, 4, 5, 2]);
      const bank = (await bankBtn(page).innerText()).replace(/\s+/g, " ");
      check(`${skin}, ${ps.length} player${ps.length > 1 ? "s" : ""}: renders, no overflow, bank reads right`,
        (await overflow(page)) <= 0 && !errors.length && (ps.length === 1 ? /bank 30 in sm straight/i : /bank 30 for bartholomew/i).test(bank),
        { overflow: await overflow(page), errors, bank });
      if (ps.length === 4) await shot(page, `card-table-${skin}`);
      await ctx.close();
    }
  }

  console.log("A table: everyone's column, and the game ends like any other");
  {
    const finished = { ...allButChance };
    const { ctx, page, errors } = await open(browser, { saved: diceGame([player("Tony", "#FF5A5F", finished), player("Sam", "#4CC9F0", finished)]) });
    await page.getByRole("button", { name: "Sam, Chance", exact: true }).click();
    await tapFaces(page, [6, 6, 6, 6, 5]);
    await bankBtn(page).click();
    await page.waitForTimeout(200);
    check("a box under Sam's name banks to Sam", /Sam/.test(await page.locator("[data-card]").innerText()) && (await store(page, "fahtzee-current-game")).players[1].scores.chance === 29);
    await page.getByRole("button", { name: "Tony, Chance", exact: true }).click();
    await tapFaces(page, [1, 1, 1, 2, 2]);
    await bankBtn(page).click();
    await page.waitForTimeout(600);
    const t = await text(page);
    const tally = await store(page, "fahtzee-tally");
    check("the last box ends the game: Sam wins 202 to 180, both on the record",
      /Sam wins with 202/.test(t) && tally.players.Sam.wins === 1 && tally.players.Tony.played === 1, { t: t.slice(0, 200), tally });
    check("no page errors", !errors.length, errors);
    await ctx.close();
  }

  console.log("Your card alone: friends' totals settle it");
  const finishAlone = async (friends, extra = 100, scores = allButChance, faces = [6, 6, 6, 6, 5]) => {
    const o = await open(browser, { saved: diceGame([player("Tony", "#FF5A5F", scores, 0)], extra) });
    await o.page.getByRole("button", { name: "Chance", exact: true }).click();
    await tapFaces(o.page, faces);
    await bankBtn(o.page).click();
    await o.page.waitForTimeout(300);
    for (let i = 0; i < friends.length; i++) {
      await o.page.getByLabel(`Friend ${i + 1} name`).fill(friends[i][0]);
      await o.page.getByLabel(`Friend ${i + 1} score`).fill(String(friends[i][1]));
    }
    return o;
  };
  {
    const { ctx, page, errors } = await finishAlone([["Sam", 190], ["Mum", 150]]);
    const total = await page.locator("[data-card-total]").innerText();
    check("the card adds up: 173 + Chance 29 = 202", total.trim() === "202", total);
    await shot(page, "friends-before");
    await page.getByRole("button", { name: /Put it on the record/ }).click();
    await page.waitForTimeout(800);
    const tally = await store(page, "fahtzee-tally");
    const hist = await store(page, "fahtzee-history");
    check("a win: Tony's game, win, best and run count", tally.players.Tony.played === 1 && tally.players.Tony.wins === 1 && tally.players.Tony.best === 202 && tally.players.Tony.streak === 1, tally);
    check("the friends go on nobody's record", !tally.players.Sam && !tally.players.Mum && Object.keys(tally.h2h || {}).length === 0, tally);
    check("history keeps the friends for the recent list", hist[0].friends.length === 2 && hist[0].winners[0] === "Tony", hist[0]);
    const said = await page.evaluate(() => window.__said.join(" | "));
    check("the announcer names the margin over Sam", /12 points/.test(said) && /Sam/.test(said), said);
    check("the saved card is cleared once recorded", (await store(page, "fahtzee-current-game")) === null);
    await shot(page, "friends-after");
    await page.getByRole("button", { name: /Undo your last score/ }).click();
    await page.waitForTimeout(300);
    const undone = await store(page, "fahtzee-tally");
    check("undo after recording takes the game back off the books", !undone || !undone.players.Tony || undone.players.Tony.played === 0, undone);
    check("no page errors", !errors.length, errors);
    await ctx.close();
  }
  {
    const { ctx, page } = await finishAlone([["Sam", 250]]);
    await page.getByRole("button", { name: /Put it on the record/ }).click();
    await page.waitForTimeout(500);
    const tally = await store(page, "fahtzee-tally");
    check("a loss counts against Tony's ratio and run", tally.players.Tony.played === 1 && tally.players.Tony.wins === 0 && tally.players.Tony.streak === -1, tally);
    const hist = await store(page, "fahtzee-history");
    await ctx.close();
    // The recent games list names the friend who actually won
    const { ctx: c2, page: p2 } = await open(browser);
    await p2.evaluate(([h, t]) => { localStorage.setItem("fahtzee-history", JSON.stringify(h)); localStorage.setItem("fahtzee-tally", JSON.stringify(t)); }, [hist, tally]);
    await p2.reload();
    await p2.waitForTimeout(400);
    await p2.getByRole("button", { name: /Stats & history/ }).click();
    check("the recent list reads 'Sam won · Sam 250 · Tony 202'", /Sam won · Sam 250 · Tony 202/.test(await text(p2)));
    await c2.close();
  }
  {
    const { ctx, page } = await finishAlone([]);
    await page.getByRole("button", { name: /Put it on the record/ }).click();
    await page.waitForTimeout(500);
    const tally = await store(page, "fahtzee-tally");
    check("with no friends typed in, only the best score counts", tally.games === 0 && tally.players.Tony.played === 0 && tally.players.Tony.best === 202 && tally.players.Tony.streak === 0, tally);
    await ctx.close();
  }

  console.log("House rules: what an extra Fahtzee is worth");
  {
    const withFahtzee = { ...allButChance, fahtzee: 50 };
    const { ctx, page } = await finishAlone([], 50, withFahtzee, [4, 4, 4, 4, 4]);
    const total = await page.locator("[data-card-total]").innerText();
    // 173 + 50 (the Fahtzee box) + 20 (Chance) + 50 (one extra Fahtzee at house rules)
    check("a second Fahtzee at house rules 50 adds 50, not 100", total.trim() === "293", total);
    await ctx.close();
  }
  for (const [label, bot, want] of [["pass and play with house rules", false, 0], ["pass and play against the AI", true, 100]]) {
    const { ctx, page } = await open(browser, { lobby: { mode: "pass", standard: false, extra: 0 } });
    await page.locator("input").nth(0).fill("Tony");
    if (!bot) await page.locator("input").nth(1).fill("Sam");
    else await page.getByRole("button", { name: /Add AI/ }).click();
    await page.getByRole("button", { name: "Let's Go" }).click();
    await page.waitForTimeout(400);
    const g = await store(page, "fahtzee-current-game");
    check(`${label}: each extra Fahtzee worth ${want}`, g && g.extraFahtzee === want && g.mode === "pass", g && g.extraFahtzee);
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} failure(s)` : "\nAll real-dice checks passed");
  process.exit(failures ? 1 : 0);
})();
