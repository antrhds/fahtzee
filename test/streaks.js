// Stats panel: streaks, rivalries and the record.
// Drives the BUILT index.html in jsdom — never a test copy, which can drift.
//   node test/streaks.js
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

// Ten games: Tony wins the last 4, AI leads the head to head 6-4, Tony holds the record
const games = ["AI", "AI", "AI", "AI", "AI", "AI", "Tony", "Tony", "Tony", "Tony"].map(
  (winner, i) => ({
    winners: [winner],
    results: [
      { name: "Tony", total: i === 9 ? 312 : winner === "Tony" ? 200 + i : 150 + i },
      { name: "AI", total: winner === "AI" ? 200 + i : 150 + i },
    ],
  })
);
const history = games.slice().reverse(); // storage keeps newest first

// Boots the app with seeded localStorage, opens the Stats panel, returns its text.
const boot = (seed, width = 360) =>
  new Promise((resolve) => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: "https://example.com/",
      beforeParse(w) {
        Object.defineProperty(w, "innerWidth", { value: width, configurable: true });
        seed(w);
      },
    });
    setTimeout(() => {
      const doc = dom.window.document;
      // Match on <button>, not loose divs: a div match finds the wrapper and the
      // click silently does nothing.
      const stats = [...doc.querySelectorAll("button")].find((b) =>
        /Stats & history/.test(b.textContent)
      );
      if (!stats) return resolve("(stats button not found)");
      stats.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      setTimeout(() => resolve(doc.getElementById("root").textContent), 400);
    }, 900);
  });

const seedFresh = (w) => {
  // No tally: exercises loadTally's seed-from-history path
  w.localStorage.setItem("fahtzee-history", JSON.stringify(history));
};
const seedLegacy = (w) => {
  // A pre-v2.7 tally with no streak or h2h, and more games than history holds
  w.localStorage.setItem("fahtzee-history", JSON.stringify(history));
  w.localStorage.setItem(
    "fahtzee-tally",
    JSON.stringify({
      games: 40,
      players: {
        Tony: { wins: 18, played: 40, best: 312 },
        AI: { wins: 22, played: 40, best: 288 },
      },
    })
  );
};

let failures = 0;
const check = (label, ok, text) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    failures++;
    console.log("        ...", JSON.stringify(String(text).slice(-320)));
  }
};

(async () => {
  const fresh = await boot(seedFresh);
  console.log("\n[1] fresh tally, seeded from history");
  check("win streak line", /Tony has won 4 on the bounce/.test(fresh), fresh);
  check("losing streak line", /AI has lost 4 on the bounce, which they are handling well/.test(fresh), fresh);
  check("rivalry line", /AI leads Tony 6 to 4/.test(fresh), fresh);
  check("record line", /Best ever: 312, by Tony, who still brings it up/.test(fresh), fresh);

  const legacy = await boot(seedLegacy);
  console.log("\n[2] pre-v2.7 tally: lifetime totals survive, form is backfilled");
  // The point of the migration: history is capped at 30, so recomputing lifetime
  // totals from it would turn 18 wins into 4 and quietly lose games.
  check("lifetime wins preserved (18, not 4)", /18/.test(legacy), legacy);
  check("games played preserved (40, not 10)", /40/.test(legacy), legacy);
  check("streak backfilled from history", /Tony has won 4 on the bounce/.test(legacy), legacy);
  check("rivalry backfilled from history", /AI leads Tony 6 to 4/.test(legacy), legacy);

  const empty = await boot(() => {});
  console.log("\n[3] empty device");
  check(
    "no narrative lines, friendly empty state",
    /No games recorded yet on this device/.test(empty) && !/Best ever/.test(empty),
    empty
  );

  console.log("\n" + (failures ? `${failures} FAILURE(S)` : "ALL PASS"));
  process.exit(failures ? 1 : 0);
})();
