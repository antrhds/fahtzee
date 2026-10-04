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

**"We have Dice"** (Tony's idea, October 2026; decisions agreed, mock-up shown, awaiting sign off)
A scorecard mode for a table with real dice, chosen in the lobby beside Pass and play. After
their final roll in real life a player taps the box they want, then enters what the dice show
by tapping a row of six dice (1 to 6) five times; a counter dot under each die shows how many
times it has been tapped, and Undo takes the last tap back. A Bank button ("Bank 25 in Full
House") confirms; the usual undo applies after. Dice that do not fit the box score 0: that is
how you scratch, no separate button. Extra Fahtzees give the bonus automatically, joker style,
exactly as the digital game does.
Two layouts from one lobby: one name gives "your phone, your card" (friends roll their own
phones or paper); two to four names give one phone for the table, a column per player.
The end: your total, then type in friends' names and totals to settle who won. Agreed with
Tony: your game, score, best and win or loss count in Stats and streaks; the friends' typed
numbers decide the result and go on nobody's record. In the one-phone layout everyone is a
real player and everyone's stats count, as in pass and play.

**House rules** (ships with We have Dice)
A lobby card: "Standard rules" on (today's game) or off, which asks what each extra Fahtzee is
worth (0, 50, 100, or a typed value). Offered in We have Dice and in pass and play with no AI;
games with the AI are always standard, as the AI is tuned for them. Store the value on the
saved game so a resume keeps it; the scorecard's bonus line and totalsFor read it instead of
the fixed 100.

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
