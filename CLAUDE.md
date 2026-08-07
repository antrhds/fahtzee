# Fahtzee — project guide for Claude

A pass and play Yahtzee style dice game. One HTML file served from GitHub Pages at
https://antrhds.github.io/fahtzee/ , built from React source in `src/`.

The owner is Tony. He is not a developer and does not read the code: describe changes in
plain English, not diffs. He will describe bugs from a player's point of view ("the dice
just appear", "iPhone users are complaining") — translate that into the technical cause
yourself rather than asking him to.

---

## 1. Repo layout

```
index.html                 GENERATED bundle — never hand edit the <script> block
                           (the <head> IS hand maintained: see build, below)
sw.js                      Service worker, hand written
manifest.webmanifest       PWA manifest, rarely changes
README.md                  Player facing docs AND the in app release notes
.nojekyll                  Tells Pages to skip Jekyll and serve the tree verbatim
package.json               Pins React. The build needs it; node_modules is gitignored
test/                      npm test: streaks.js (jsdom) and skins.js (Playwright)
sounds/                    Optional user supplied recordings (may not exist)
entry.jsx                  Build entry point: mounts src/App.jsx into #root
src/
  App.jsx      (~2340 lines) All UI: themes, icons, Die, Confetti, screens, game flow
  constants.js VERSION string, COLOUR_CHOICES, PIP_LAYOUTS
  logic.js     counts, sum, SCORERS, UPPER, LOWER, UPPER_KEYS, totalsFor
  audio.js     Web Audio synth effects, sample loader, speech (say), haptics
  ai.js        botChooseHolds / botChooseCategory / botShouldStop, levels 0/1/2, sleep
  lines.js     The announcer's script: win/loss lines, AI table talk, Stats panel lines
  storage.js   localStorage: lifetime tally, streaks, head to head, recent history, resume
```

`index.html` is the bundle. It contains all of React plus the whole game inlined in a
`<script>` tag, so it works with no network and no build step on the user's side.

The source lives here, in this repo. It did not always — before v2.7 it lived outside and
built files were uploaded through the GitHub web UI. If you find yourself editing the
minified bundle, stop: you are in the wrong file.

---

## 2. Build and release — follow exactly

**Install** (fresh working copy): `npm install`. React is pinned to 19.2.8 in
`package.json`; that exact version reproduces the shipped bundle byte for byte, so do not
float it.

**Build command** (esbuild):

```bash
npx esbuild entry.jsx --bundle --minify --format=iife \
  --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
```

Then splice `bundle.js` into `index.html` between the existing `<script>` and
`</script>` markers, replacing the old bundle and preserving the head and the service
worker registration block at the bottom. esbuild already escapes a literal `</script>`
inside string literals as `<\/script>`; assert there is no raw one before writing.

The `<head>` is **not** generated. Font links, the boot placeholder and the meta tags are
hand maintained there and must survive the splice untouched.

**Release checklist — every single release:**

1. Bump `VERSION` in `src/constants.js` (e.g. `"v2.9"`). This string is displayed in the
   lobby and is the ONLY way Tony can tell whether a deploy actually landed.
2. If `index.html` changed at all, bump the cache name in `sw.js`
   (`const CACHE = "fahtzee-v2-8"` → `"fahtzee-v2-9"`). Non negotiable: a stale cache
   name means users keep the old game. This has bitten this project twice.
3. Rebuild `index.html`.
4. Update `README.md`: add a version history entry at the top of the list, and update any
   feature paragraphs the change affects. The README is also shown inside the app, so it
   is user facing, not just repo decoration.
5. Commit all changed files together (`index.html`, `sw.js`, `src/*`, `README.md`).
6. Tell Tony which version number to look for in the lobby to confirm the deploy.

---

## 3. Testing — this project does not ship untested

`npm test` runs both suites in `test/` against the built `index.html`. Run it before
every release, and extend it rather than writing throwaway scripts:

```
test/streaks.js   Stats panel narrative lines, the pre-v2.7 tally migration,
                  and the empty device. jsdom.
test/skins.js     Every skin renders at 360px with no page errors and no
                  horizontal overflow. Playwright.
```

`test/skins.js` uses the preinstalled Chromium at `/opt/pw-browsers/chromium` when it
exists, so no browser download is needed and a mismatched Playwright version does not
matter. Set `CHROMIUM_PATH` to point elsewhere.

There is no test framework beyond that. Testing is done by driving the built
`index.html` in jsdom with Node. The pattern:

```js
const { JSDOM } = require('jsdom');
const html = require('fs').readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
                              url: 'https://example.com/' });
// find buttons by text, click, assert on root.textContent after a setTimeout
```

Always test the **built** `index.html`, not a test copy that has drifted from it.

Useful techniques already proven here:

- **Seed state before boot** with jsdom's `beforeParse(w)` hook, writing to
  `w.localStorage`. Seeding `fahtzee-history` alone exercises the tally's rebuild path.
- **Seed a near finished game** by writing `fahtzee-current-game` into localStorage
  before the page boots, then clicking Resume. Lets you test endgame, ties and roll offs
  without playing 13 rounds.
- **Find controls with `querySelectorAll('button')` and match on text.** Matching loose
  `div`s finds the wrapper instead and the click does nothing, silently.
- **Mock speech** with `window.SpeechSynthesisUtterance` + `window.speechSynthesis` to
  assert on what the announcer says.
- **Simulate a small phone** with `Object.defineProperty(window, "innerWidth", { value: 360 })`
  before boot, to check layouts on Tony's Galaxy (he will notice overflow immediately).
- Allow generous timeouts: the AI's turn takes ~10s of wall clock, roll animations ~0.5s.

Playwright with the preinstalled Chromium is the better tool for anything visual: render
each skin at 360px and assert `scrollWidth <= clientWidth` to catch overflow, and take
screenshots for sign off. Google Fonts is reachable, so a webfont can be embedded as a
data URI for a truthful preview.

Always run a regression check on every skin you did not touch. Cross skin breakage has
happened.

---

## 4. Conventions and gotchas learned the hard way

**Skins.** Five: `dark`, `light`, `tabletop`, `neon`, `casino`, cycled in that order by
the corner button and persisted in localStorage under `fahtzee-skin`. The button shows
the *next* skin's icon, not the current one. `T` is a module level variable reassigned
each render to `THEMES[skin]`. Themes carry not just colours but construction tokens:
`cardBorder`, `cardShadow`, `dieBorder`, `dieFace`, `diePip`, `btnBorder`, `btnShadow`,
`btnCase`, `btn`, `font`, `displayFont`, `wordmark`, `wordmarkShadow`, `overlay`,
`placeholder`, `sectionText`. **Every skin must define every token** — a missing one is
`undefined`, not a fallback. (The one conditional token is `wordmarkShadow`, read only
when `wordmark` is set; dark and light leave `wordmark` null and use a gradient instead.) Tabletop has its own full playing screen layout (a separate
`if (skin === "tabletop")` branch before the Classic return) with a scoreboard plaque, a
board, and tile scorecard; the other four share the Classic layout and so inherit its
fixes for free. **Never edit theme values from inside a bulk find and replace over colour
strings** — doing so once made the THEMES object self referential and crashed the app.

**Add capability as a token, not a branch.** When a skin needs something the tokens
cannot express, add a token and set it for all five, rather than an `if (skin === ...)`
inside a component. `dieFace`, `diePip`, `displayFont` and `wordmarkShadow` were all
added this way. The moment themes stop being data, they stop being safe to edit.

**Fonts.** Tabletop uses Baloo 2, Neon uses Audiowide, both from Google Fonts in a single
request, loaded non blocking (`media="print" onload="this.media='all'"`) with a
`<noscript>` fallback. Never make a font render blocking: a blank page caused by a slow
font request cost this project days of debugging. Note `font` is applied at the app root,
so it hits everything including the stats table's tabular figures — use `displayFont`
for a display face so it reaches the wordmark only.

**Die colours.** Players pick their own die colour, and a chosen colour beats the theme.
`dieFace` and `diePip` only apply to uncoloured dice, so a skin's character on the dice
has to come from `diceShadow`, which applies either way. Held dice are hardcoded gold in
every skin.

**Responsive.** Tony's phone is ~360 CSS px. Flex children holding inputs need
`minWidth: 0` or they overflow. Tabletop board dice are sized from `window.innerWidth`,
not fixed.

**Async safety.** `gameIdRef` is a generation counter. Bump it on new game, undo and
resume; every async loop (AI turn, roll animation, roll off) captures it and bails if it
changes. Preserve this pattern in any new async work or stale timers will corrupt state.

**Storage keys.** `fahtzee-tally` (lifetime stats, never expires), `fahtzee-history`
(recent 30 games), `fahtzee-current-game` (resume), `fahtzee-skin`. All access is wrapped
in try/catch — storage can be unavailable and the game must still run.

The tally also holds `streak` per player (positive won, negative lost) and an `h2h`
ledger, both written by `tallyForm` at the moment a game is recorded. **History is capped
at 30, so never recompute lifetime totals from it** — that silently deletes games from
anyone who has played more. The v2.7 migration rebuilds only streaks and head to head
from history and leaves `wins`, `played` and `best` alone. Any future migration must
respect the same line.

**Sounds.** Synthesised in Web Audio, no assets. If a `sounds/` folder exists with
`roll1..3`, `hold`, `bank`, `fahtzee`, `win` (mp3/m4a/wav) those override the synth.
Speech uses the device engine; it does not work in sandboxed previews, only on the real
site. Same for shake to roll (needs HTTPS + real device motion).

**iOS.** `purgeUndoStack()` defuses Apple's shake to undo dialogue. Do not remove it.

**Known rough edge.** The version link in the lobby header is a hardcoded blue, not a
token, so it sits oddly on Casino's baize. Fixing it means adding a `link` token to all
five skins.

**Deployment.** GitHub Pages serves the last *successful* build. Failed or queued builds
are silent — the old version just keeps being served. If Tony says an update has not
appeared, check the Actions tab before suspecting the code; the site once sat on v2.2.1
for two days while four uploads failed to deploy, and nothing anywhere said so.
Concurrent pushes can wedge the Pages queue. Cancelling a stuck run is the right first
move, but the API may refuse both cancel and re-run on a genuinely wedged run — a fresh
commit pushed to `main` is the lever that reliably works, because it mints a new run
instead of fighting the old one. Never push a commit that deletes `index.html` as part of
a delete-then-re-add cycle: Pages will happily build the intermediate commit and can
deploy a site with no game in it.

---

## 5. Voice and tone

**In game copy** is dry, warm and British. UK spellings. Understated jokes rather than
exclamation marks. Examples in the wild: "no arguing with the dice, they cannot hear you
and they do not care", "for church", "please clap". Never write like a mobile game
("Awesome!! 🎉 You're on FIRE!").

**The announcer** (`lines.js`) name checks players and mocks losers gently. The AI is
smug when winning, grudging when beaten. Add new lines to the existing arrays rather than
restructuring. The Stats panel's streak, rivalry and record lines live here too. Use
**they** for players, never he or she: names are whatever people type in.

**README version history** entries are one line, factual, with a dry aside where earned.
It is a genuinely funny document and should stay that way.

**Never rename the game.** It is Fahtzee, deliberately not the trademarked name. The
sibling project Fahkle lives in a different repo — check which repo you are in before
committing (this has gone wrong once).

---

## 6. Working with Tony

- Lead with what changed for the player, then how to deploy it. Skip the code walkthrough
  unless asked.
- He gives feedback in batches and expects all of it addressed in one version.
- If a change is largely visual and substantial, mock it up first (render a PNG) and get
  sign off before building. A rebuilt screen was rejected twice as "just a palette
  cleanse" before this approach was adopted. Render the mock in the *real* app where you
  can, not a standalone approximation: a hand built mock of the dice missed that players
  choose their own colours.
- When he asks for options, give him a small number rendered side by side in the real
  screen, with a recommendation and the reasoning. He will overrule it on taste, which is
  the correct division of labour.
- Push back honestly. He asked whether the project counts as vibe coded and wanted the
  real answer, not flattery.
