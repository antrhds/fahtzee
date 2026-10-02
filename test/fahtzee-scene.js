// The Fahtzee cut-scene: five alike off a roll stops the game for a few seconds
// of cinema, then hands back; anything less does not. The AI waits for it
// rather than playing on underneath, an early tap does not skip it, the
// announcer says it once (not again when it is scored), and people who asked
// for less motion are spared.
//   node test/fahtzee-scene.js        (SHOTS=dir to save screenshots)
// Playwright against the built index.html, at Tony's phone size. The dice are
// loaded by replacing Math.random before the page boots.
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

const game = (aiFirst) => ({
  v: 2,
  savedAt: Date.now(),
  players: aiFirst
    ? [
        { name: "AI", colour: "#4CC9F0", scores: {}, yahtzeeBonuses: 0, isBot: true, level: 1 },
        { name: "Tony", colour: "#FF5A5F", scores: {}, yahtzeeBonuses: 0, isBot: false },
      ]
    : [
        { name: "Tony", colour: "#FF5A5F", scores: {}, yahtzeeBonuses: 0, isBot: false },
        { name: "Ann", colour: "#B388FF", scores: {}, yahtzeeBonuses: 0, isBot: false },
      ],
  current: 0,
  round: 3,
  dice: [1, 2, 3, 4, 5],
  held: [false, false, false, false, false],
  rollsLeft: 3,
});

// dice: "sixes" (every die a six) or "mixed" (never five alike)
const open = async (browser, { aiFirst = false, dice = "sixes", skin = "dark", reduced = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(([g, d, sk]) => {
    localStorage.setItem("fahtzee-current-game", JSON.stringify(g));
    localStorage.setItem("fahtzee-skin", sk);
    sessionStorage.setItem("fahtzee-splash-seen", "1");
    if (d === "sixes") Math.random = () => 0.99;
    else { let i = 0; Math.random = () => [0.05, 0.25, 0.45, 0.65, 0.85][i++ % 5]; }
    // count what the announcer says
    window.__said = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    Object.defineProperty(window, "speechSynthesis", { value: { speak: (u) => window.__said.push(u.text), cancel() {}, getVoices: () => [] } });
  }, [game(aiFirst), dice, skin]);
  await page.goto(PAGE);
  await page.waitForTimeout(600);
  for (const label of [/Resume/i, /I'M READY/i]) {
    const b = page.getByRole("button", { name: label }).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(500); }
  }
  return { ctx, page, errors };
};
const scene = (page) => page.locator("[data-fahtzee-scene]").count();
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("fahtzee-current-game") || "null"));

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const shots = process.env.SHOTS;

  // 1. Tony rolls five sixes: the full cut-scene, then the game carries on
  let { ctx, page, errors } = await open(browser);
  await page.locator("button", { hasText: /^Roll/ }).click();
  await page.waitForTimeout(550); // the roll animation
  check("five alike off a roll starts the cut-scene", (await scene(page)) === 1);
  const label = await page.getAttribute("[data-fahtzee-scene]", "aria-label");
  check("it knows what was rolled", /Five sixes/.test(label), label);
  let at = 0;
  for (const t of [0.5, 1.0, 1.85, 2.3, 3.2]) {
    await page.waitForTimeout(Math.max(0, (t - at) * 1000));
    at = t;
    if (shots) await page.screenshot({ path: path.join(shots, `scene-${t}.png`) });
    if (t === 0.5) {
      await page.mouse.click(180, 400);
      check("an early tap does not skip it", (await scene(page)) === 1);
    }
  }
  const busy = await page.evaluate(() => {
    const c = document.querySelector("[data-fahtzee-scene] canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    return seen.size;
  });
  check("the canvas is busy (not a blank screen)", busy > 40, `colours=${busy}`);
  await page.waitForTimeout(1600);
  check("it leaves by itself", (await scene(page)) === 0);
  check("the announcer said it during the scene", (await page.evaluate(() => window.__said.filter((s) => /Fart sea/.test(s)).length)) === 1);
  const g1 = await saved(page);
  check("the dice are still five sixes underneath", g1 && g1.dice.every((d) => d === 6), g1 && g1.dice);
  await page.locator("button", { hasText: /^Fahtzee/i }).first().click();
  await page.waitForTimeout(1200);
  check("scoring it does not say it a second time", (await page.evaluate(() => window.__said.filter((s) => /Fart sea/.test(s)).length)) === 1,
    await page.evaluate(() => window.__said));
  const g2 = await saved(page);
  check("and the Fahtzee is banked for 50", g2 && g2.players[0].scores.fahtzee === 50, g2 && g2.players[0].scores);
  check("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 2. Anything less than five alike: no scene
  ({ ctx, page, errors } = await open(browser, { dice: "mixed" }));
  await page.locator("button", { hasText: /^Roll/ }).click();
  await page.waitForTimeout(1500);
  check("a mixed roll does not start it", (await scene(page)) === 0);
  await ctx.close();

  // 3. The AI rolls one: it waits for its own cut-scene before it scores
  ({ ctx, page, errors } = await open(browser, { aiFirst: true }));
  let seen = false, scoredDuring = false;
  for (let i = 0; i < 60 && !seen; i++) {
    await page.waitForTimeout(150);
    seen = (await scene(page)) === 1;
  }
  check("the AI's five alike gets the cut-scene too", seen);
  const aiLabel = seen ? await page.getAttribute("[data-fahtzee-scene]", "aria-label") : "";
  for (let i = 0; i < 20 && (await scene(page)); i++) {
    const g = await saved(page);
    if (g && Object.keys(g.players[0].scores).length) scoredDuring = true;
    await page.waitForTimeout(200);
  }
  check("the AI does not play on underneath it", !scoredDuring);
  await page.waitForTimeout(3000);
  const g3 = await saved(page);
  check("then it scores its Fahtzee", g3 && g3.players[0].scores.fahtzee === 50, g3 && g3.players[0].scores);
  check("in its own words", /calculated|applaud|minuted/.test(aiLabel), aiLabel);
  if (shots) {
    // one frame of the AI's, mid word, for sign off
    ({ ctx, page } = await open(browser, { aiFirst: true }));
    for (let i = 0; i < 60 && !(await scene(page)); i++) await page.waitForTimeout(100);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(shots, "scene-ai.png") });
  }
  check("no page errors (AI)", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 4. Every skin: it plays, with no errors or overflow
  for (const skin of ["light", "tabletop", "neon", "casino", "resistance"]) {
    ({ ctx, page, errors } = await open(browser, { skin }));
    await page.locator("button", { hasText: /^Roll/ }).first().click();
    await page.waitForTimeout(2600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(`${skin}: plays with no overflow or errors`, (await scene(page)) === 1 && !overflow && errors.length === 0, errors.join(" | "));
    if (shots && skin === "tabletop") await page.screenshot({ path: path.join(shots, "scene-tabletop.png") });
    await ctx.close();
  }

  // 5. Reduced motion: no cut-scene, and the announcer still says it on scoring
  ({ ctx, page, errors } = await open(browser, { reduced: true }));
  await page.locator("button", { hasText: /^Roll/ }).click();
  await page.waitForTimeout(1200);
  check("reduced motion: no cut-scene", (await scene(page)) === 0);
  await page.locator("button", { hasText: /^Fahtzee/i }).first().click();
  await page.waitForTimeout(1200);
  check("reduced motion: still announced on scoring", (await page.evaluate(() => window.__said.filter((s) => /Fart sea/.test(s)).length)) === 1);
  await ctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} failing` : "\nAll Fahtzee cut-scene checks pass");
  process.exit(failures ? 1 : 0);
})();
