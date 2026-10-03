// Cross-skin regression: every skin renders the lobby and a turn in progress at
// Tony's phone width without errors or horizontal overflow; the corner button
// cycles through all seven; a device left on retired Tabletop wakes up in Comic. Cross-skin breakage has happened before, so
// run this even for changes that touch only one skin.
//   node test/skins.js
// Uses the preinstalled Chromium where one exists, so no browser download is
// needed and a mismatched Playwright version does not matter. CHROMIUM_PATH
// overrides; otherwise Playwright finds its own.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SKINS = ["dark", "light", "comic", "sweets", "neon", "casino", "resistance"];
const PAGE = "file://" + path.join(__dirname, "..", "index.html");

const findChromium = () => {
  const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"];
  return candidates.find((p) => p && fs.existsSync(p));
};

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let failures = 0;

  for (const skin of SKINS) {
    const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.addInitScript((s) => {
      localStorage.setItem("fahtzee-skin", s);
      sessionStorage.setItem("fahtzee-splash-seen", "1"); // splash is covered by test/splash.js
    }, skin);
    await page.goto(PAGE);
    await page.waitForTimeout(700);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    const rendered = await page.evaluate(() =>
      /fahtzee/i.test(document.getElementById("root").textContent)
    );

    // And a turn in progress: Comic and Sweet Shop use the board screen, the rest Classic
    await page.evaluate(() => {
      localStorage.setItem("fahtzee-current-game", JSON.stringify({
        v: 2, savedAt: Date.now(), current: 0, round: 4, dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: 3,
        players: [
          { name: "Bartholomew", colour: "#FF5A5F", scores: { sixes: 24, chance: 22 }, yahtzeeBonuses: 0, isBot: false },
          { name: "Ann", colour: "#4CC9F0", scores: { ones: 3 }, yahtzeeBonuses: 0, isBot: false },
        ],
      }));
    });
    await page.reload();
    await page.waitForTimeout(700);
    for (const label of [/Resume/i, /I'M READY/i, /^Roll/i]) {
      const b = page.locator("button:not([disabled])", { hasText: label }).first();
      if (await b.count()) { await b.click(); await page.waitForTimeout(700); }
    }
    const turnOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    const rolled = (await page.locator('button[aria-label^="Die showing"]').count()) === 5;

    const ok = rendered && errors.length === 0 && !overflow && !turnOverflow && rolled;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${skin.padEnd(10)} errors=${errors.length} overflow=${overflow}/${turnOverflow} rolled=${rolled}`
    );
    if (!ok) {
      failures++;
      errors.slice(0, 2).forEach((e) => console.log("        ", e.slice(0, 160)));
    }
    await page.close();
  }

  // The corner button walks all seven skins in order and comes back round
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
    await page.addInitScript(() => sessionStorage.setItem("fahtzee-splash-seen", "1"));
    await page.goto(PAGE);
    await page.waitForTimeout(600);
    const seen = [];
    for (let i = 0; i <= SKINS.length; i++) {
      seen.push(await page.evaluate(() => localStorage.getItem("fahtzee-skin") || "dark"));
      await page.locator('button[aria-label^="Change skin"]').click();
      await page.waitForTimeout(150);
    }
    const ok = JSON.stringify(seen) === JSON.stringify([...SKINS, SKINS[0]]);
    console.log(`  ${ok ? "PASS" : "FAIL"}  the corner button cycles ${seen.join(" > ")}`);
    if (!ok) failures++;
    await page.close();
  }

  // Tabletop was retired in v2.19: its players wake up in Comic, with no errors
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem("fahtzee-skin", "tabletop");
      sessionStorage.setItem("fahtzee-splash-seen", "1");
    });
    await page.goto(PAGE);
    await page.waitForTimeout(600);
    const font = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
    const ok = /Bangers/.test(font) && errors.length === 0;
    console.log(`  ${ok ? "PASS" : "FAIL"}  a device left on Tabletop opens in Comic (${font.split(",")[0]})`);
    if (!ok) failures++;
    await page.close();
  }

  await browser.close();
  console.log("\n" + (failures ? `${failures} SKIN REGRESSION(S)` : "NO REGRESSIONS"));
  process.exit(failures ? 1 : 0);
})();
