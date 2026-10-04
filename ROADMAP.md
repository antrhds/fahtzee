# Fahtzee roadmap

Ideas proposed to Tony and not yet built, so a fresh session can pick them up. Move an item
to the README's version history when it ships, and delete it from here. Tony picks; when he
does, mock it up in the real app first (CLAUDE.md, section 6).

Last updated after v2.21 (October 2026).

## Recommended next

**1. Daily Fahtzee** (top pick)
Everyone gets the same dice each day, seeded from the date. One game against the day, then a
Wordle-style share card ("Fahtzee #12 · 263 · 🎲🎲🎲 · beat Ruthless") for the family chat,
plus a daily streak. Lets people compete from different phones and towns with no server, no
accounts and no running cost, and works offline: it fits the one-file GitHub Pages setup.
Notes: the seed must drive every roll in order (a seeded generator replacing Math.random for
that game only); held dice must not consume rolls differently from unheld ones, or two
players' sequences diverge; record daily results separately from the lifetime tally.

**2. Coach mode**
Ruthless's look-ahead (src/ai.js) already knows the best keep and box every roll. Expose it:
a "What would Ruthless do?" button that highlights the dice it would hold, and an end-of-game
report ("You left 31 points on the table. Round 7: you banked 3 of a Kind for 18; Ruthless
would have rerolled for the Full House"). Cheap, because the engine exists; good for new
players, and a fine stage for the announcer.

## Planned for v3

**"We have Dice"** (Tony's idea, October 2026; questions below still open)
A scorecard mode for a table with real dice. No passing the phone round: each player keeps
their own card on their own phone. After their final roll in real life they tap the box they
want, then enter what the dice show by tapping a row of six dice (1 to 6) five times; the app
works out the score. At the end it adds up their total, and they can type in their friends'
names and scores to see who won.
Notes: reuses SCORERS and totalsFor from src/logic.js, so the rules (63 for the bonus, extra
Fahtzees worth 100) stay identical to the digital game. Needs a way to fix a mistyped die
or box. Open questions put to Tony: whether the friends' scores count in Stats and streaks;
whether a box can be chosen with no dice entered (scratching for 0); whether the app should
keep turn count or just fill in when tapped.

## Bigger options

**3. AI rivals with personalities**
Replace Easy / Normal / Ruthless with named characters, each with a play style and voice (a
cautious banker, a gambler who always chases the Fahtzee, a smug perfectionist). Beat one to
unlock the next, as a solo ladder. Builds on the MINDS settings in src/ai.js.

**4. Play across separate phones**
Honest assessment given to Tony: needs a server and sign-in, which breaks "no accounts, no
server" and changes what the game is. Daily Fahtzee gives most of the "playing together
apart" feeling for a fraction of the cost. Not recommended unless he insists.

## Smaller additions

- **Game recap card**: each player's best turn, the luckiest roll and the turning point, as
  an image to share.
- **More achievements** beside the milestone badges: upper bonus by round 6, two Fahtzees in
  one game, beat Ruthless by 50.
- **Family league**: a monthly table in the Stats panel, with a champion crowned each month.
- **Triple Fahtzee**: a variant with three score columns worth ×1, ×2 and ×3.

## Done from earlier lists

- Casino's version link (and AI picker) in gold instead of the shared blue: v2.21.
