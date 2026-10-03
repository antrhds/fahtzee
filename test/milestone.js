// Milestones: finishing the game that takes a player to 50, 100, 250 or 500
// lifetime games (then every 500) sets off the celebration; 499 does not; it stays until tapped, ignores the
// taps that finished the game, and the AI gets its own (smug) version.
//   node test/milestone.js            (SHOTS=dir to save screenshots)
// Playwright against the built index.html, at Tony's phone size.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

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

const ALL = ["ones", "twos", "threes", "fours", "fives", "sixes", "threeKind", "fourKind",
  "fullHouse", "smallStraight", "largeStraight", "fahtzee", "chance"];
const card = (skip) => Object.fromEntries(ALL.filter((k) => k !== skip).map((k) => [k, 10]));

// Tony is one click (Chance) from the end of a game against the AI
const nearlyDone = () => ({
  v: 2,
  savedAt: Date.now(),
  players: [
    { name: "Tony", colour: "#FF5A5F", scores: card("chance"), yahtzeeBonuses: 0, isBot: false },
    { name: "AI", colour: "#4CC9F0", scores: card(), yahtzeeBonuses: 0, isBot: true },
  ],
  current: 0,
  round: 13,
  dice: [6, 6, 5, 6, 4],
  held: [false, false, false, false, false],
  rollsLeft: 0,
});
const tally = (tonyPlayed, aiPlayed) => ({
  games: tonyPlayed,
  players: {
    Tony: { wins: 333, played: tonyPlayed, best: 521, streak: 1 },
    AI: { wins: 166, played: aiPlayed, best: 462, streak: -1 },
  },
  h2h: { Tony: { AI: 268 }, AI: { Tony: 131 } },
});

const finishGame = async (browser, tonyPlayed, aiPlayed, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ([g, t]) => {
      localStorage.setItem("fahtzee-current-game", JSON.stringify(g));
      localStorage.setItem("fahtzee-tally", JSON.stringify(t));
      sessionStorage.setItem("fahtzee-splash-seen", "1"); // splash is covered by test/splash.js
    },
    [nearlyDone(), tally(tonyPlayed, aiPlayed)]
  );
  await page.goto(PAGE);
  await page.waitForTimeout(600);
  for (const label of [/Resume/i, /I'M READY/i]) {
    await page.getByRole("button", { name: label }).first().click();
    await page.waitForTimeout(500);
  }
  await page.locator("button", { hasText: /^Chance/ }).first().click();
  return { ctx, page, errors };
};
const milestone = (page) => page.getAttribute("[data-milestone]", "data-milestone").catch(() => null);

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const shots = process.env.SHOTS;

  // 1. Game 499 comes and goes quietly
  let { ctx, page, errors } = await finishGame(browser, 498, 497);
  await page.waitForTimeout(5000);
  check("game 499: no celebration", (await page.locator("[data-milestone]").count()) === 0);
  await ctx.close();

  // 2. Game 500: the full works
  ({ ctx, page, errors } = await finishGame(browser, 499, 497));
  await page.waitForTimeout(1500);
  check("the win lands first, the celebration waits", (await page.locator("[data-milestone]").count()) === 0);
  await page.waitForTimeout(2400);
  check("then the celebration arrives", (await milestone(page)) === "on");
  const frames = [0.3, 1.6, 2.75, 3.0, 3.4, 4.6, 7.5];
  let at = 0.1; // roughly where the overlay's clock is now
  for (const t of frames) {
    await page.waitForTimeout(Math.max(0, (t - at) * 1000));
    at = t;
    if (shots) await page.screenshot({ path: path.join(shots, `milestone-${t}.png`) });
    if (t === 1.6) {
      // tapping mid count must not skip it: that tap was probably meant for the game
      await page.mouse.click(180, 600);
      check("an early tap does not skip it", (await milestone(page)) === "on");
    }
  }
  const text = await page.textContent("[data-milestone]");
  check("names Tony", /Tony/.test(text), text);
  check("shows the lifetime stats (334 won, best 521)", /334/.test(text) && /521/.test(text), text);
  const tally500 = await page.evaluate(() => JSON.parse(localStorage.getItem("fahtzee-tally")).players.Tony.played);
  check("the tally really says 500", tally500 === 500, tally500);
  const colours = await page.evaluate(() => {
    const c = document.querySelector("[data-milestone] canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    return seen.size;
  });
  check("the canvas is busy (fireworks, not a blank screen)", colours > 60, `colours=${colours}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check("no horizontal overflow at 360px", !overflow);
  await page.waitForTimeout(5000);
  check("still there 15s in: it waits to be tapped", (await milestone(page)) === "on");
  await page.mouse.click(180, 600);
  await page.waitForTimeout(800);
  check("a tap sends it away", (await page.locator("[data-milestone]").count()) === 0);
  check("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 3. The AI's 500th, with Tony on 300: the AI gets its moment, Tony does not,
  //    and it is the AI's own version, not the fireworks night
  ({ ctx, page, errors } = await finishGame(browser, 300, 499));
  await page.waitForTimeout(3700);
  check("the AI's version is the AI style", (await page.getAttribute("[data-milestone]", "data-milestone-style").catch(() => null)) === "ai");
  at = 0.1;
  for (const t of [1.0, 2.4, 3.0, 3.6, 7.5]) {
    await page.waitForTimeout(Math.max(0, (t - at) * 1000));
    at = t;
    if (shots) await page.screenshot({ path: path.join(shots, `milestone-ai-${t}.png`) });
  }
  const aiText = (await page.locator("[data-milestone]").count()) ? await page.textContent("[data-milestone]") : "";
  check("the AI's 500th is celebrated, as the AI's", /AI/.test(aiText) && !/Tony/.test(aiText), aiText);
  check("in its own words", /games processed/i.test(aiText) && /acknowledge/i.test(aiText), aiText);
  check("no page errors (AI)", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 4. The smaller milestones fire with their own number; near misses stay quiet
  for (const [before, fires] of [[49, true], [99, true], [249, true], [149, false], [749, false], [999, true]]) {
    ({ ctx, page, errors } = await finishGame(browser, before, 10));
    await page.waitForTimeout(4300);
    const label = (await page.locator("[data-milestone]").count())
      ? await page.getAttribute("[data-milestone]", "aria-label") : "";
    const n = before + 1;
    check(`game ${n}: ${fires ? "celebrates " + n : "stays quiet"}`,
      fires ? label.startsWith(`${n} games`) : label === "", label);
    if (shots && n === 50) {
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(shots, "milestone-50.png") });
    }
    check(`no page errors (game ${n})`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // 5. Reduced motion: a still, finished frame, no animation
  ({ ctx, page, errors } = await finishGame(browser, 499, 10, { reducedMotion: "reduce" }));
  await page.waitForTimeout(4200);
  check("reduced motion still celebrates (as a still)", (await milestone(page)) === "on");
  if (shots) await page.screenshot({ path: path.join(shots, "milestone-still.png") });
  check("no page errors (reduced motion)", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 6. Badges: one per milestone, in the lobby, each one a replay
  const SKINS = ["dark", "light", "comic", "sweets", "neon", "casino", "resistance"];
  for (const skin of SKINS) {
    ctx = await browser.newContext({ viewport: { width: 360, height: 900 } });
    page = await ctx.newPage();
    errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([t, sk]) => {
      localStorage.setItem("fahtzee-tally", JSON.stringify(t));
      localStorage.setItem("fahtzee-skin", sk);
      sessionStorage.setItem("fahtzee-splash-seen", "1");
    }, [{ ...tally(500, 498), players: { ...tally(500, 498).players,
      Jo: { wins: 1, played: 3, best: 224, streak: 0 }, Tommy: { wins: 1, played: 1, best: 231, streak: 1 } } }, skin]);
    await page.goto(PAGE);
    await page.waitForTimeout(600);
    await page.locator("button", { hasText: "Badges" }).click();
    await page.waitForTimeout(300);
    const head = await page.locator("button", { hasText: "Badges" }).textContent();
    const panel = await page.textContent("[data-badges]");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(`${skin}: badges open with no overflow at 360px`, !overflow);
    check(`${skin}: no page errors`, errors.length === 0, errors.join(" | "));
    if (skin === "dark") {
      check("7 collected: Tony's four and the AI's three", /7 collected/.test(head), head);
      check("Jo is told how far off the first one is", /47 to go/.test(panel), panel);
    }
    if (shots && (skin === "dark" || skin === "light" || skin === "resistance")) {
      await page.locator("[data-badges]").scrollIntoViewIfNeeded();
      await page.locator("[data-badges]").screenshot({ path: path.join(shots, `badges-${skin}.png`) });
    }
    if (skin === "light") {
      await page.getByRole("button", { name: /Tony: 500 games badge/ }).click();
      await page.waitForTimeout(4200);
      const txt = await page.textContent("[data-milestone]");
      check("Tony's 500 badge replays his 500, with his stats", /Tony/.test(txt) && /521/.test(txt) && (await page.getAttribute("[data-milestone]", "aria-label")).startsWith("500 games"), txt);
      await page.mouse.click(180, 600);
      await page.waitForTimeout(800);
      check("and taps away again", (await page.locator("[data-milestone]").count()) === 0);
      await page.getByRole("button", { name: /AI: 250 games badge/ }).click();
      await page.waitForTimeout(4200);
      const aiTxt = await page.textContent("[data-milestone]");
      check("the AI's 250 badge replays in the AI's style", (await page.getAttribute("[data-milestone]", "data-milestone-style")) === "ai" &&
        (await page.getAttribute("[data-milestone]", "aria-label")).startsWith("250 games"));
      check("an old badge leaves out today's stats", !/WIN RATE/i.test(aiTxt), aiTxt);
    }
    await ctx.close();
  }
  // ...and an empty device says so
  ctx = await browser.newContext({ viewport: { width: 360, height: 900 } });
  page = await ctx.newPage();
  await page.addInitScript(() => sessionStorage.setItem("fahtzee-splash-seen", "1"));
  await page.goto(PAGE);
  await page.waitForTimeout(600);
  await page.locator("button", { hasText: "Badges" }).click();
  check("empty device: no badges yet", /No badges yet/.test(await page.textContent("[data-badges]")));
  await ctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} failing` : "\nAll milestone checks pass");
  process.exit(failures ? 1 : 0);
})();
