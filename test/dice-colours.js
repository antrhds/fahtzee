// Per-skin die colours must be a RENDER-TIME remap only.
// The hex stored on a player is what saved games and the lifetime record hold,
// so it must stay the colour the player actually picked, whatever skin is on.
// If this ever fails, a game saved in one skin will resume in another wearing a
// colour the picker does not offer.
//   node test/dice-colours.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "..", "index.html");
const CHOSEN = ["#FF5A5F", "#4CC9F0"]; // Red and Blue, as stored by the lobby

// skin -> what Red should be painted as
const EXPECTED = {
  dark: "rgb(255, 90, 95)", // #FF5A5F, unchanged
  light: "rgb(255, 90, 95)",
  tabletop: "rgb(255, 90, 95)",
  casino: "rgb(255, 90, 95)",
  neon: "rgb(255, 46, 99)", // #FF2E63, the neon-tuned red
  resistance: "rgb(192, 73, 43)", // #C0492B, rust
};

const savedGame = () => ({
  v: 2,
  savedAt: Date.now(),
  players: [
    { name: "Tony", colour: CHOSEN[0], scores: {}, yahtzeeBonuses: 0, isBot: false },
    { name: "Ann", colour: CHOSEN[1], scores: {}, yahtzeeBonuses: 0, isBot: false },
  ],
  current: 0,
  round: 3,
  dice: [5, 5, 2, 5, 6],
  held: [false, false, false, false, false], // unheld: held dice are gold in every skin
  rollsLeft: 1,
});

const findChromium = () =>
  [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && fs.existsSync(p));

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    console.log("        ", detail);
  }
};

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  for (const [skin, expectedRed] of Object.entries(EXPECTED)) {
    const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
    await page.addInitScript(
      ([g, s]) => {
        localStorage.setItem("fahtzee-skin", s);
        localStorage.setItem("fahtzee-current-game", JSON.stringify(g));
      },
      [savedGame(), skin]
    );
    await page.goto(PAGE);
    await page.waitForTimeout(700);

    for (const label of [/Resume|Carry on|Continue/i, /I'M READY/i]) {
      const btn = page.getByRole("button", { name: label }).first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
    }

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("fahtzee-current-game")).players.map((p) => p.colour)
    );
    const painted = await page.evaluate(() => {
      const d = document.querySelector('button[aria-label^="Die showing"]');
      return d ? getComputedStyle(d).backgroundColor : null;
    });

    check(
      `${skin.padEnd(9)} stored hex is untouched`,
      JSON.stringify(stored) === JSON.stringify(CHOSEN),
      `expected ${JSON.stringify(CHOSEN)}, got ${JSON.stringify(stored)}`
    );
    check(
      `${skin.padEnd(9)} die painted ${expectedRed}`,
      painted === expectedRed,
      `expected ${expectedRed}, got ${painted}`
    );

    await page.close();
  }

  await browser.close();
  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "ALL PASS"));
  process.exit(failures ? 1 : 0);
})();
