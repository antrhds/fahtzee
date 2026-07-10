# 🎲 Fahtzee

A pass and play dice game for people who like Yahtzee but respect trademark law.

**Play it now:** [antrhds.github.io/fahtzee](https://antrhds.github.io/fahtzee/)

No downloads. No accounts. No ads. One phone, up to four players, and thirteen rounds to find out who in your family is secretly ruthless. Or install it: visit on Android and Chrome will offer to add Fahtzee to your home screen as a proper app, full screen, own icon, playable offline.

## How it works

Enter two to four names and tap your dot to pick a colour: red, blue, orange, yellow, green or purple. First come, first served, and no two players can clash. Short a player? Draft in the AI and pick its mood: Easy holds a pair when it trips over one and sometimes banks the wrong thing entirely. Normal plays a sensible game. Ruthless hunts Fahtzees, hoards double pairs for full houses, and will not waste Chance on a bad hand. Choose according to who needs beating.

Pass the phone around. Each turn you get three rolls of five dice, holding the ones you like between rolls, then bank your score in one of thirteen categories. The scorecard shows both sections side by side so the whole game fits on one screen. Fill the card, count the points, crown a champion.

The upper section pays a 35 point bonus if you can scrape 63 across the number categories, and the card counts you down to it as you go. Five of a kind is a Fahtzee, worth 50, and every one after that is worth 100 more.

## Fahtzee forgives

Banked the wrong category with a clumsy thumb? An undo button appears after every score, on every screen, and puts things back exactly as they were. One level deep, so use it before the next mistake.

Phone died mid game? Safari ate the tab? The game saves itself after every single move. Come back and you will find a Resume card waiting: round, whose turn, everyone's names. Round eleven is never lost again.

## Features

You can shake your phone to roll, which is objectively the correct way to roll dice in the year 2026. The rattle is properly modelled: layered impacts in stereo that start fast, bounce, and settle differently every time, over a soft table rumble. On Android the phone buzzes along with the tumble too. Holds click, banked scores chime, and if you roll a Fahtzee the phone plays a fanfare and then says it out loud. You will know it when you hear it.

The game also has opinions about how it ends. Beat the AI solo and it congratulates you by name. Lose to it and it offers commiserations, also by name, which is somehow worse. In local play the winner gets the glory and the losers get addressed collectively, which is exactly what they deserve. Winners also get confetti.

Scored categories get crossed off, a live preview shows what every open category would pay, and ties at the top are settled the only honourable way: a sudden death roll off. Five dice, one throw each, highest total takes the crown. Still level? Go again. Someone will crack.

Every finished game is saved to the device, so the Stats panel keeps a running tally of wins, games played and best scores. There is a light mode for garden play, a dark mode for everyone else, and a speaker button that silences the lot, for church.

## Bring your own sounds

Fancy the game sounding like your actual dice on your actual table? Record them and drop the files into a `sounds` folder in this repo: `roll1`, `roll2`, `roll3` for roll variations, plus `hold`, `bank`, `fahtzee` and `win`, in mp3, m4a or wav. The game finds them automatically. Anything missing falls back to the synth. The Fahtzee voice speaks regardless. That is not configurable. It is the soul of the game.

## The tech bit

Three files: the game (React, bundled, minified, no build step, no server), a web app manifest so it installs like a real app, and a service worker that caches everything so it loads instantly and works with no signal. Sounds are synthesised live in the browser unless you supply recordings, the voice comes from the device's own speech engine, and games and stats live in local storage on the phone. Under the surface the code is split into proper modules now: game logic, audio, the AI's brain, storage, and the app itself.

Shake to roll uses the device motion sensors, which browsers only allow over HTTPS. iPhones ask permission once with a small button under the roll button, and the game quietly defuses Apple's shake to undo dialogue so your roll is just a roll. That is Apple being Apple, twice.

## House rules

There is only one: no arguing with the dice. They cannot hear you and they do not care.

## Version history

**v2.0** The big one. Resume interrupted games, undo any banked score, install as a real app with offline play, haptic dice on Android, three AI difficulty levels, and a full rebuild of the code underneath

**v2.0.1 in spirit** Briefly turned Fahkle into Fahtzee by uploading to the wrong repo. Rolled back. Every proper project has one of these

**v1.6.2** Upper and lower sections side by side so the whole card fits one screen, plus a countdown to the upper bonus

**v1.6.1** Optional recorded sound effects via a sounds folder

**v1.6** Much richer dice rattle in stereo, and the game announces the winner by name, with commiserations for solo losses

**v1.5.1** Defused the iPhone shake to undo dialogue

**v1.5** Player colour picker, two colour icons, Robo renamed AI, and the phone says the word when you roll five of a kind

**v1.4** Sound effects, confetti, match history and stats, and a computer opponent

**v1.3** Light mode toggle for the sun lounge faction

**v1.2** Tie break roll offs, proper roll animation on the first throw

**v1.1** Shake to roll, blank dice before your first throw, clearer scorecard, full rebrand

**v1.0** Four player pass and play with the handoff screen

**v0.1** One player, one scorecard, big dreams

---

Built over a sunny week with Claude, partly from a sun lounger. Winner does the washing up. That is not a typo.
