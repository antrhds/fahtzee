# 🎲 Fahtzee

A pass and play dice game for people who like Yahtzee but respect trademark law.

**Play it now:** [antrhds.github.io/fahtzee](https://antrhds.github.io/fahtzee/)

If you are reading this inside the game, hello. You tapped the version number and the game fetched its own documentation, which we are both quietly pleased about.

No downloads. No accounts. No ads. One phone, up to four players, and thirteen rounds to find out who in your family is secretly ruthless. Or install it: visit on Android and Chrome will offer to add Fahtzee to your home screen as a proper app, full screen, own icon, playable offline.

## How it works

Enter two to four names and tap your die to pick its colour: red, blue, orange, yellow, green or purple. Your dice are yours now. When your turn comes, the dice on the table roll in your colour, first come first served, and no two players can clash. Short a player? Draft in the AI and pick its mood: Easy holds a pair when it trips over one and sometimes banks the wrong thing entirely. Normal plays a sensible game. Ruthless hunts Fahtzees, hoards double pairs for full houses, and will not waste Chance on a bad hand. Choose according to who needs beating. In solo play the AI goes first, so you always know exactly what you are chasing.

Pass the phone around. Each turn you get three rolls of five dice, holding the ones you like between rolls, then bank your score in one of thirteen categories. New to it? There is a How to play guide right there in the lobby with the full rules, so nobody has to explain the Full House situation mid game ever again.

The upper section pays a 35 point bonus if you can scrape 63 across the number categories, and the card counts you down to it as you go. Five of a kind is a Fahtzee, worth 50, and every one after that is worth 100 more.

## Fahtzee forgives

Banked the wrong category with a clumsy thumb? An undo button appears after every score, on every screen, and puts things back exactly as they were. One level deep, so use it before the next mistake.

Phone died mid game? Safari ate the tab? The game saves itself after every single move. Come back and you will find a Resume card waiting: round, whose turn, everyone's names. Round eleven is never lost again.

## Fahtzee talks

If you roll five of a kind the phone plays a fanfare and then says the name of the game out loud. You will know it when you hear it.

The announcer has a script, and it varies. Beat the AI solo and you might be told the machines never stood a chance, or that somewhere a server is sulking. Lose and the commiserations come by name, which is somehow worse. In local play the winner gets the glory and the losers get name checked individually, right down to who is doing the washing up.

The AI also talks at the table. Bank a big score against it and there is a decent chance it mutters something: Too easy. As calculated. You may applaud. Roll a Fahtzee against it and it usually cannot help itself. It has demanded a scan of the dice before now. Beating Ruthless while it chirps at you is a genuine family event.

## Features

You can shake your phone to roll, which is objectively the correct way to roll dice in the year 2026. The rattle is properly modelled: layered impacts in stereo that start fast, bounce, and settle differently every time, over a soft table rumble. On Android the phone buzzes along with the tumble too. Holds click, banked scores chime, winners get confetti.

Scored categories get crossed off, a live preview shows what every open category would pay, and the whole scorecard fits on one screen. Ties at the top are settled the only honourable way: a roll off. Three rolls of five dice each, your highest counts, and the AI takes its rolls all by itself while you watch. Still level after that? Go again. Someone will crack.

The Stats panel keeps a lifetime ledger on the device: wins, win percentage, games played and best scores that count up forever, plus a feed of recent results. Above the table it reads the room: who is on a winning run, who is on the other kind, how the head to head stands once two players have met five times, and the best score ever alongside the name of whoever still mentions it. Roll off victories credit exactly one champion, because this scorekeeping has been through an audit. The win percentage column has started at least one argument already.

The game has three skins, cycled from the button in the corner and remembered between visits. Classic Dark is arcade at night. Classic Light is for the garden. And Tabletop turns the whole thing into a board game: terracotta table, cream panels with thick charcoal outlines, a scoreboard plaque with everyone's totals up top, big outlined dice sitting on a proper board, and a scorecard laid out as tiles. Same game, different furniture. The speaker button below silences the lot, for church.

## Bring your own sounds

Fancy the game sounding like your actual dice on your actual table? Record them and drop the files into a `sounds` folder in this repo: `roll1`, `roll2`, `roll3` for roll variations, plus `hold`, `bank`, `fahtzee` and `win`, in mp3, m4a or wav. The game finds them automatically. Anything missing falls back to the synth. The Fahtzee voice speaks regardless. That is not configurable. It is the soul of the game.

## The tech bit

Three files: the game (React, bundled, minified, no build step, no server), a web app manifest so it installs like a real app, and a service worker that caches everything for offline play while always fetching the freshest version when you are online. We learned that second part the hard way. Sounds are synthesised live in the browser unless you supply recordings, the voice comes from the device's own speech engine, and games and stats live in local storage on the phone. These very words are fetched live from the repo when you tap the version number, so the notes in the app are never out of date. Under the surface the code is split into proper modules: game logic, audio, the AI's brain, the announcer's script, storage, and the app itself.

Shake to roll uses the device motion sensors, which browsers only allow over HTTPS. iPhones ask permission once with a small button under the roll button, and the game quietly defuses Apple's shake to undo dialogue so your roll is just a roll. That is Apple being Apple, twice.

## House rules

There is only one: no arguing with the dice. They cannot hear you and they do not care.

## Version history

**v2.7** The Stats panel now tells you the story before the table: who is on a run and who is not, the head to head once two players have met five times, and the best score ever with the name of whoever will not let it go. Old devices keep their lifetime totals and have their streaks worked out from recent games

**v2.6.1** The Tabletop font now loads in the background rather than holding the game hostage, and a slow connection gets a Loading Fahtzee message instead of a blank screen. The dice were always there, they just would not appear until the typeface did

**v2.6** Win percentage in the stats, roll offs are now best of three rolls each, the AI goes first in solo play so you know what you are chasing, and it takes its roll off turns by itself. Dedicated to the first ever tie: 260 apiece, settled by the machine, naturally

**v2.5.1** Lobby and dice now size themselves properly on smaller phones

**v2.5** The Tabletop skin got its real playing screen: scoreboard plaque, dice on a board, scorecard as tiles. Built from a mockup this time, which is the correct order

**v2.4** Tabletop gained proper construction: charcoal outlines, hard flat shadows, and a chunky rounded typeface. Reviewed by the client as a palette cleanse, hence v2.5

**v2.3** A skin changer: Classic dark, Classic light, and the first cut of Tabletop

**v2.2.1** The in app notes now always fetch fresh, after the offline cache tried to keep an old copy of this very document. Second haunting, final exorcism

**v2.2** A How to play guide in the lobby, and tap the version number to read these very notes inside the game. Yes, the README knows you are here

**v2.1.1** Lifetime stats that count forever instead of stopping at 100 games, and tie games now credit exactly one winner after the roll off. The books balance

**v2.1** Pick your dice colour in the lobby, a full script of randomised winner announcements that name check the losers, and the AI now talks at the table

**v2.0** The big one. Resume interrupted games, undo any banked score, install as a real app with offline play, haptic dice on Android, three AI difficulty levels, and a full rebuild of the code underneath

**v2.0.1 in spirit** Briefly turned Fahkle into Fahtzee by uploading to the wrong repo. Rolled back. Every proper project has one of these

**v1.6.2** Upper and lower sections side by side so the whole card fits one screen, plus a countdown to the upper bonus

**v1.6.1** Optional recorded sound effects via a sounds folder

**v1.6** Much richer dice rattle in stereo, and the game announces the winner by name

**v1.5.1** Defused the iPhone shake to undo dialogue

**v1.5** Player colour picker, two colour icons, Robo renamed AI, and the phone says the word when you roll five of a kind

**v1.4** Sound effects, confetti, match history and stats, and a computer opponent

**v1.3** Light mode toggle for the sun lounge faction

**v1.2** Tie break roll offs, proper roll animation on the first throw

**v1.1** Shake to roll, blank dice before your first throw, clearer scorecard, full rebrand

**v1.0** Four player pass and play with the handoff screen

**v0.1** One player, one scorecard, big dreams

---

Vibe coded over a sunny fortnight with Claude, partly from a sun lounger. Tested like it wasn't. Winner does the washing up. That is not a typo.
