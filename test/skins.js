// Cross-skin regression: every skin renders at Tony's phone width without
// errors or horizontal overflow. Cross-skin breakage has happened before, so
// run this even for changes that touch only one skin.
//   node test/skins.js
// Uses the preinstalled Chromium where one exists, so no browser download is
// needed and a mismatched Playwright version does not matter. CHROMIUM_PATH
// overrides; otherwise Playwright finds its own.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SKINS = ["dark", "light", "tabletop", "neon", "casino", "resistance"];
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

    await page.addInitScript((s) => localStorage.setItem("fahtzee-skin", s), skin);
    await page.goto(PAGE);
    await page.waitForTimeout(700);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    const rendered = await page.evaluate(() =>
      /fahtzee/i.test(document.getElementById("root").textContent)
    );

    const ok = rendered && errors.length === 0 && !overflow;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${skin.padEnd(9)} errors=${errors.length} overflow=${overflow}`
    );
    if (!ok) {
      failures++;
      errors.slice(0, 2).forEach((e) => console.log("        ", e.slice(0, 160)));
    }
    await page.close();
  }

  await browser.close();
  console.log("\n" + (failures ? `${failures} SKIN REGRESSION(S)` : "NO REGRESSIONS"));
  process.exit(failures ? 1 : 0);
})();
