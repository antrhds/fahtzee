// Per-skin die colours must be a RENDER-TIME remap only, and no skin's finish on a
// coloured die (gloss, shine, dots) may add anything that reads as an extra pip.
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
  comic: "rgb(232, 34, 46)", // #E8222E, comic red
  sweets: "rgb(255, 75, 114)", // #FF4B72, strawberry
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
  dice: [1, 5, 2, 5, 6], // a one first: its empty corners are where a stray highlight would show
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
        sessionStorage.setItem("fahtzee-splash-seen", "1"); // splash is covered by test/splash.js
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

    // Nothing on a die may read as a pip: count the near-white spots on the first die
    // (showing 1, white pip on red) and expect exactly one. A round sugar-shine
    // highlight once made threes look like fours in Sweet Shop (v2.21).
    const die = page.locator('button[aria-label^="Die showing"]').first();
    const shot = (await die.screenshot()).toString("base64");
    const spots = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
      const white = (i) => data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
      const seen = new Uint8Array(width * height);
      let blobs = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const k = y * width + x;
        if (seen[k] || !white(k * 4)) continue;
        let size = 0, edge = false; const stack = [k]; seen[k] = 1;
        while (stack.length) {
          const q = stack.pop(); size++;
          const qx = q % width, qy = (q - qx) / width;
          if (qx === 0 || qy === 0 || qx === width - 1 || qy === height - 1) edge = true; // the page behind a rounded corner
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const n = ny * width + nx;
            if (!seen[n] && white(n * 4)) { seen[n] = 1; stack.push(n); }
          }
        }
        if (size > 12 && !edge) blobs++;
      }
      return blobs;
    }, shot);
    check(`${skin.padEnd(9)} a one shows one spot, nothing that passes for a pip`, spots === 1, `counted ${spots}`);

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
