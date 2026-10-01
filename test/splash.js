// The opening splash: plays once per session, skips on a tap, gets out of the
// way by itself, and never plays for people who have asked for less motion.
//   node test/splash.js
// Playwright against the built index.html, at Tony's phone size.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "..", "index.html");
const VIEW = { viewport: { width: 360, height: 740 } };
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
const splashCount = (page) => page.locator("[data-splash]").count();

(async () => {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  // 1. First visit: it plays, it draws, it fits the screen
  let ctx = await browser.newContext(VIEW);
  let page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(PAGE);
  await page.waitForTimeout(1200);
  check("plays on the first visit", (await splashCount(page)) === 1);
  const colours = await page.evaluate(() => {
    const c = document.querySelector("[data-splash] canvas");
    const g = c.getContext("2d");
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    return seen.size;
  });
  check("draws something (not a blank canvas)", colours > 20, `colours=${colours}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  check("no horizontal overflow at 360px", !overflow);

  // 2. A tap skips it, and the tap does not fall through to the lobby
  const before = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  await page.mouse.click(180, 400);
  await page.waitForTimeout(650);
  check("a tap skips it", (await splashCount(page)) === 0);
  const after = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  check("the skipping tap does not land on the lobby", before === after, `${before} -> ${after}`);
  check("the lobby is there underneath", /v2\.\d+/.test(await page.textContent("#root")));

  // 3. Same session: not again
  await page.reload();
  await page.waitForTimeout(500);
  check("does not play again in the same session", (await splashCount(page)) === 0);
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 200));
  await ctx.close();

  // 4. Left alone, it finishes and leaves by itself
  ctx = await browser.newContext(VIEW);
  page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(4000);
  check("still playing at 4s", (await splashCount(page)) === 1);
  await page.waitForTimeout(2600);
  check("gone by itself by 6.6s", (await splashCount(page)) === 0);
  await ctx.close();

  // 5. Reduced motion: never shown
  ctx = await browser.newContext({ ...VIEW, reducedMotion: "reduce" });
  page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(500);
  check("skipped when the device asks for reduced motion", (await splashCount(page)) === 0);
  await ctx.close();

  await browser.close();
  console.log("\n" + (failures ? `${failures} SPLASH FAILURE(S)` : "SPLASH OK"));
  process.exit(failures ? 1 : 0);
})();
