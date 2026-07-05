# 🎲 Fahtzee

A pass and play dice game for people who like Yahtzee but respect trademark law.

**Play it now:** [antrhds.github.io/fahtzee](https://antrhds.github.io/fahtzee/)

No downloads. No accounts. No ads. One phone, up to four players, and thirteen rounds to find out who in your family is secretly ruthless.

## How it works

Enter two to four names and tap your dot to pick a colour: red, blue, orange, yellow, green or purple. First come, first served, and no two players can clash. Short a player? Draft in the AI, a computer opponent who plays its turns in front of you: rolling, holding, chasing straights, and guarding its Fahtzee box like it actually cares. It is decent but beatable, which is the correct difficulty for a machine.

Pass the phone around. Each turn you get three rolls of five dice, holding the ones you like between rolls, then bank your score in one of thirteen categories. Fill the card, count the points, crown a champion.

The upper section pays a 35 point bonus if you can scrape 63 across the number categories. Five of a kind is a Fahtzee, worth 50, and every one after that is worth 100 more.

## Features

You can shake your phone to roll, which is objectively the correct way to roll dice in the year 2026. The dice tumble with a properly modelled rattle: a dozen individual impacts that start fast and settle, different every time. Holds click, banked scores chime, and if you roll a Fahtzee the phone plays a fanfare and then says it out loud. You will know it when you hear it.

Scored categories get crossed off so you can see at a glance what is left, and a live preview shows what every open category would pay before you commit. Ties at the top are settled the only honourable way: a sudden death roll off. Five dice, one throw each, highest total takes the crown. Still level? Go again. Someone will crack.

Every finished game is saved to the device, so the Stats panel on the name screen keeps a running tally of wins, games played and best scores. First to notice their win percentage against a family member is on their own. Winners get confetti. Losers get the washing up.

There is a light mode for garden play and a dark mode for everyone else. The sun and moon button in the corner sorts it, and the speaker button below it silences the lot, for church.

## The tech bit

The whole game is one HTML file. React, bundled and minified, with no build step, no server, and no dependencies fetched at runtime. All the sounds are synthesised live in the browser, the voice comes from the device's own speech engine, and match history lives in local storage on the phone, so stats are per device. It works offline once loaded and it lives happily on GitHub Pages, which is exactly where you are standing.

Shake to roll uses the device motion sensors, which browsers only allow over HTTPS. iPhones will ask permission once with a small button under the roll button. That is Apple being Apple.

## House rules

There is only one: no arguing with the dice. They cannot hear you and they do not care.

## Version history

**v1.5** Player colour picker, two colour icons instead of emojis, Robo renamed AI, and the phone now says the word when you roll five of a kind

**v1.4** Sound effects, confetti for winners, match history and stats, and a computer opponent, plus a far more realistic dice rattle

**v1.3** Light mode toggle for the sun lounge faction

**v1.2** Tie break roll offs, proper roll animation on the first throw

**v1.1** Shake to roll, blank dice before your first throw, clearer scorecard, full rebrand

**v1.0** Four player pass and play with the handoff screen

**v0.1** One player, one scorecard, big dreams

---

Built over a sunny weekend with Claude, partly from a sun lounger. Winner does the washing up. That is not a typo.
