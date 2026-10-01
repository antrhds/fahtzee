// The opening splash: once per session it waits on a Tap to play card, that
// tap starts the animation and its soundtrack, a second tap skips, it leaves
// by itself when done, and it never shows for people who asked for less motion.
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
  // Count soundtrack starts, so we can tell the tap really switched the sound on
  const countAudio = () => {
    window.__clips = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      window.__clips++;
      return start.apply(this, a);
    };
  };
  const state = (page) => page.getAttribute("[data-splash]", "data-splash");

  // 1. First visit: the still card, and it waits for a tap however long it takes
  let ctx = await browser.newContext(VIEW);
  let page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(countAudio);
  await page.goto(PAGE);
  await page.waitForTimeout(1200);
  check("opens on the still card", (await state(page)) === "waiting");
  check("the card says Tap to play", /tap to play/i.test(await page.textContent("[data-splash]")));
  const colours = await page.evaluate(() => {
    const c = document.querySelector("[data-splash] canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    return seen.size;
  });
  check("draws something (not a blank canvas)", colours > 20, `colours=${colours}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  check("no horizontal overflow at 360px", !overflow);
  check("no sound before the tap", (await page.evaluate(() => window.__clips)) === 0);
  await page.waitForTimeout(5500);
  check("still waiting after 6.7s untouched", (await state(page)) === "waiting");

  // 2. The tap starts the animation and the soundtrack, without reaching the lobby
  const before = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  await page.mouse.click(180, 400);
  await page.waitForTimeout(700);
  check("a tap starts the animation", (await state(page)) === "playing");
  check("the same tap starts the soundtrack", (await page.evaluate(() => window.__clips)) === 1);
  const after = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  check("the tap does not land on the lobby", before === after, `${before} -> ${after}`);

  // 3. A second tap skips the rest
  await page.mouse.click(180, 400);
  await page.waitForTimeout(650);
  check("a second tap skips it", (await splashCount(page)) === 0);
  check("the lobby is there underneath", /v2\.\d+/.test(await page.textContent("#root")));

  // 4. Same session: not again
  await page.reload();
  await page.waitForTimeout(500);
  check("does not play again in the same session", (await splashCount(page)) === 0);
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 200));
  await ctx.close();

  // 5. Tapped once and left alone, it finishes and leaves by itself
  ctx = await browser.newContext(VIEW);
  page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(600);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);
  check("a key works as the tap, and it is still playing 3s in", (await state(page)) === "playing");
  await page.waitForTimeout(2300);
  check("gone by itself 5.3s after the tap", (await splashCount(page)) === 0);
  await ctx.close();

  // 6. Reduced motion: never shown
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
