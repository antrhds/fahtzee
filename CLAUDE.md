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
test/                      npm test: streaks.js (jsdom), skins.js + dice-colours.js + splash.js + milestone.js + fahtzee-scene.js + undo.js (Playwright), ai.js (Node + Playwright)
sounds/                    Optional user supplied recordings (may not exist)
entry.jsx                  Build entry point: mounts src/App.jsx and the splash overlay into #root
src/
  App.jsx      (~2340 lines) All UI: themes, icons, Die, Confetti, screens, game flow
  constants.js VERSION string, COLOUR_CHOICES, PIP_LAYOUTS
  logic.js     counts, sum, SCORERS, UPPER, LOWER, UPPER_KEYS, totalsFor
  audio.js     Web Audio synth effects, sample loader, speech (say), haptics
  ai.js        botChooseHolds / botChooseCategory / botShouldStop, levels 0/1/2, sleep.
               Easy is rules of thumb; Normal and Ruthless are a look-ahead over every keep
               (MINDS sets how far ahead and how much they value the bonus). Pass rollsLeft
  lines.js     The announcer's script: win/loss lines, AI table talk, Stats panel lines
  storage.js   localStorage: lifetime tally, streaks, head to head, recent history, resume
  splash.js    The opening splash, drawn live on a canvas; every frame is a pure f(t)
  milestone.js The milestone (50/100/250/500/every 500) celebration, drawn live on a canvas; every frame is a pure f(t).
               Two looks on one clock: fireworks for people, drawAI (digit rain, glitch) when only the AI got there
  Milestone.jsx Shows it when App fires the `fahtzee-milestone` window event after recordGame
               finds a player's lifetime `played` at 50, 100, 250, 500, 1000, ... (isMilestone in lines.js).
               The lobby's Badges panel fires the same event with `replay: true` to play one again;
               badges are derived from `played` (milestonesUpTo), never stored
  fahtzee-scene.js  The Fahtzee cut-scene (letterbox, dice fly in, the word letter by letter), pure f(t)
  FahtzeeScene.jsx  Plays it on the `fahtzee-scene` window event, fired by doRoll when a roll lands
               five alike (at least one die rolled), and fires `fahtzee-scene-done` when over.
               App's sceneOnRef blocks Roll and holds the AI's turn loop until then; sceneSpokeRef
               stops scoreCategory saying "Fahtzee" a second time
  Splash.jsx   Once per session (sessionStorage): a Tap to play card, whose tap starts
               the animation AND its soundtrack (phones need a tap for sound); 2nd tap skips
  splash-audio.js  GENERATED soundtrack (base64 MP3, ~57 KB): never hand edit
tools/
  splash-score.py  Synthesises the soundtrack and writes src/splash-audio.js (numpy + ffmpeg)
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
test/skins.js     Every skin renders the lobby and a turn at 360px with no page errors
                  and no horizontal overflow; the corner button cycles all seven; a
                  stored `tabletop` opens in Comic. Playwright.
test/dice-colours.js  Per-skin die colours are a render-time remap only: the
                  stored hex must survive every skin. Playwright.
test/splash.js    The splash waits on its card, the tap starts animation and sound
                  without reaching the lobby, a second tap skips, it leaves by
                  itself, it plays once per session, honours reduced motion.
                  The other suites seed sessionStorage `fahtzee-splash-seen` so
                  they start in the lobby; do the same in any new test.
test/milestone.js Milestones: 499 stays quiet, 500 celebrates after the win lands,
                  50/100/250/1000 fire and 150/750 do not, early taps do not skip it,
                  a tap after dismisses it, the AI's own style, reduced motion, and the
                  lobby's Badges panel in all seven skins (counts, replays, empty device).
                  SHOTS=dir saves screenshots. Playwright.
test/fahtzee-scene.js Five alike starts the cut-scene and a mixed roll does not, early taps
                  do not skip it, it leaves by itself, "Fahtzee" is said exactly once, the AI
                  waits for it before scoring, all seven skins, reduced motion. Math.random is
                  replaced before boot to load the dice. SHOTS=dir saves screenshots.
test/undo.js      The undo button goes with the next turn's first roll in all seven skins, and
                  with the first roll-off roll; undoing the final score takes the recorded
                  game back off the books so re-banking it counts once.
test/ai.js        Plays N (default 300) seeded solo games per AI level straight from src/ai.js:
                  each level's average must sit in its band (Easy 145-180, Normal 215-240,
                  Ruthless 235+). Specific decisions, then each level plays a real turn in the
                  built page. Retune the AI against this, not by feel.
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

**Skins.** Seven: `dark`, `light`, `comic`, `sweets`, `neon`, `casino`, `resistance`, cycled in that order by
the corner button and persisted in localStorage under `fahtzee-skin`. The button shows
the *next* skin's icon, not the current one. `T` is a module level variable reassigned
each render to `THEMES[skin]`. Themes carry not just colours but construction tokens:
`cardBorder`, `cardShadow`, `dieBorder`, `dieFace`, `diePip`, `dieColours`, `colourGlow`,
`held`, `rosterBand`, `btnBorder`, `btnShadow`, `btnCase`, `btn`, `font`, `displayFont`,
`wordmark`, `wordmarkShadow`, `overlay`, `placeholder`, `sectionText`, and since v2.19 `btnFont`, `cardRadius`,
`link`, `pick` (the selected AI toggle and level), `wordmarkFill`/`wordmarkStroke` (clipped
text fill, Sweet Shop's candy cane), `wordmarkBadge` (Comic's starburst), `dieGloss` and
`dieInset` (layers over a coloured die: Comic's dots, Sweet Shop's sugar shine) and `board`.
Comic and Sweet Shop set them inline; the older five get them in one explicit `Object.assign`.
**Every skin must define every token** — a missing one is
`undefined`, not a fallback. (The one conditional token is `wordmarkShadow`, read only
when `wordmark` is set; dark and light leave `wordmark` null and use a gradient instead.)
There are two playing screens. A skin with a `board` token (Comic, Sweet Shop) gets the board
screen, an `if (T.board)` branch before the Classic return: scoreboard plaque, dice on a
board, tile scorecard, all coloured from `board` (ink, paper, plaque, tabs, radius, shadow,
an optional `caption` box and `font`). `board: null` (the other five) gets Classic. Fix a
playing-screen bug in both. The board screen was built for Tabletop, retired in v2.19;
`RETIRED_SKINS` maps a stored `tabletop` to `comic`, and must keep doing so.
**Never edit theme values from inside a bulk find and replace over colour
strings** — doing so once made the THEMES object self referential and crashed the app.

**Add capability as a token, not a branch.** When a skin needs something the tokens
cannot express, add a token and set it for every skin, rather than an `if (skin === ...)`
inside a component. `dieFace`, `diePip`, `displayFont`, `wordmarkShadow`, `dieColours`,
`colourGlow`, `held` and `rosterBand` were all added this way. The moment themes stop being data, they stop being safe to edit.

**Fonts.** Comic uses Bangers and Comic Neue, Sweet Shop Fredoka and Titan One, Neon and
Resistance Audiowide; Baloo 2 is still loaded for the splash, milestone and cut-scene canvases. All from Google Fonts in a single
request, loaded non blocking (`media="print" onload="this.media='all'"`) with a
`<noscript>` fallback. Never make a font render blocking: a blank page caused by a slow
font request cost this project days of debugging. Note `font` is applied at the app root,
so it hits everything including the stats table's tabular figures — use `displayFont`
for a display face so it reaches the wordmark only.

**Die colours.** Players pick their own die colour from `COLOUR_CHOICES`. `dieFace` and
`diePip` only apply to uncoloured dice. A skin may retune the six through the
`dieColours` token (a map from the chosen hex to the skin's version, `null` to leave them
alone) and may ask for `colourGlow`, which haloes each die and each player's name in
their own colour instead of using `diceShadow`.

**The stored hex is sacred.** A player's colour is written onto the player and saved into
`fahtzee-current-game`, so `dieColours` is a *render time* remap only — never change
`COLOUR_CHOICES` per skin, or a game saved in one skin resumes in another wearing a
colour the picker does not offer. Every display read goes through `skinColour()`; the
three places that write or compare the stored hex (roster creation, the taken-colour set,
the bot's colour) deliberately do not. `test/dice-colours.js` guards this.

**Held dice** are painted by three things at once — a 3px border, a 4px ring and
the gradient face used when a die has no player colour — all read from the `held`
token. The five older skins share one HELD_GOLD object so they cannot drift;
Resistance clamps in ink because gold made a third warm colour on bone.

**`rosterBand`** paints a panel behind the lobby's name rows. `null` for every
skin but Resistance, which insets them into slate. If you touch the lobby, check
the gap between name inputs is still 14px in all seven: the rows are wrapped in a
flex child, and it is easy to shift the spacing everywhere without noticing.

**Responsive.** Tony's phone is ~360 CSS px. Flex children holding inputs need
`minWidth: 0` or they overflow. Board-screen dice are sized from `window.innerWidth`,
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

**Sound needs the finger to lift.** Start audio from `onClick` (or a key), never
`onPointerDown`/`touchstart`: phones grant sound permission on touch end, so a touch-down
handler is silent on a real phone. Desktop test browsers grant it on touch-down too, so
they cannot catch this; `test/splash.js` instead asserts a press alone does nothing.
v2.12 shipped a silent splash this way.

**Undo is for thumbs, not second goes.** Every undo button renders on `canUndo`, which
is false once the current turn has rolled (or is rolling) and once a roll-off has
thrown. Without that a player could roll, dislike it, undo the previous score, have it
re-banked and start their turn afresh (v2.17). The game is recorded the moment the
result is known, so `recordSnapRef` keeps the books as they were and `undoLast` puts
them back; otherwise undoing the final score and banking it again counts the game twice.

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
