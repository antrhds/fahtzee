import React, { useState, useCallback, useEffect, useRef } from "react";
import { VERSION, COLOUR_CHOICES, PIP_LAYOUTS } from "./constants.js";
import { counts, SCORERS, UPPER, LOWER, totalsFor } from "./logic.js";
import { say, sayFahtzee, play, loadSamples, setSoundEnabled, haptic } from "./audio.js";
import { botChooseHolds, botChooseCategory, botShouldStop, sleep } from "./ai.js";
import { loadHistory, loadTally, recordGame, saveCurrentGame, loadCurrentGame, clearCurrentGame } from "./storage.js";
import { pick, nameList, SOLO_WIN, SOLO_LOSS, LOCAL_WIN, AI_WINS_LOCAL, AI_SMUG, AI_GRUDGING, RIVALRY_MIN, streakLine, rivalryLine, bestLine } from "./lines.js";

// ---------- Themes ----------
const THEMES = {
  dark: {
    bg: "linear-gradient(180deg, #17132B 0%, #201A3D 55%, #17132B 100%)",
    text: "#F5F3FA",
    sub70: "rgba(245,243,250,0.7)", sub60: "rgba(245,243,250,0.6)", sub55: "rgba(245,243,250,0.55)",
    sub50: "rgba(245,243,250,0.5)", sub45: "rgba(245,243,250,0.45)", sub35: "rgba(245,243,250,0.35)",
    sub30: "rgba(245,243,250,0.3)", sub25: "rgba(245,243,250,0.25)",
    card: "rgba(255,255,255,0.06)", card2: "rgba(255,255,255,0.05)", rowBg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.1)", border2: "rgba(255,255,255,0.08)", border3: "rgba(255,255,255,0.2)",
    borderIdle: "rgba(255,255,255,0.15)", inputBorder: "rgba(255,255,255,0.14)",
    chipBg: "rgba(255,255,255,0.07)",
    tray: "rgba(0,0,0,0.3)", inputBg: "rgba(0,0,0,0.25)", section: "rgba(0,0,0,0.2)",
    diceShadow: "0 6px 16px rgba(0,0,0,0.5)",
    blankBorder: "rgba(255,255,255,0.25)", blankBg: "rgba(255,255,255,0.04)", blankText: "rgba(255,255,255,0.3)",
    green: "#80ED99", greenBg: "rgba(128,237,153,0.16)",
  },
  light: {
    bg: "linear-gradient(180deg, #F7F4FD 0%, #ECE5F9 55%, #F7F4FD 100%)",
    text: "#241E3D",
    sub70: "rgba(36,30,61,0.78)", sub60: "rgba(36,30,61,0.65)", sub55: "rgba(36,30,61,0.6)",
    sub50: "rgba(36,30,61,0.55)", sub45: "rgba(36,30,61,0.5)", sub35: "rgba(36,30,61,0.42)",
    sub30: "rgba(36,30,61,0.36)", sub25: "rgba(36,30,61,0.3)",
    card: "rgba(255,255,255,0.75)", card2: "rgba(255,255,255,0.65)", rowBg: "rgba(36,30,61,0.03)",
    border: "rgba(36,30,61,0.13)", border2: "rgba(36,30,61,0.1)", border3: "rgba(36,30,61,0.28)",
    borderIdle: "rgba(36,30,61,0.2)", inputBorder: "rgba(36,30,61,0.18)",
    chipBg: "rgba(36,30,61,0.07)",
    tray: "rgba(36,30,61,0.08)", inputBg: "rgba(255,255,255,0.85)", section: "rgba(36,30,61,0.08)",
    diceShadow: "0 6px 14px rgba(36,30,61,0.28)",
    blankBorder: "rgba(36,30,61,0.3)", blankBg: "rgba(36,30,61,0.05)", blankText: "rgba(36,30,61,0.35)",
    green: "#1E9E4F", greenBg: "rgba(30,158,79,0.14)",
  },
  tabletop: {
    bg: "linear-gradient(180deg, #EDA07E 0%, #E58A64 60%, #E8916B 100%)",
    text: "#3A2E28",
    sub70: "rgba(58,46,40,0.8)", sub60: "rgba(58,46,40,0.68)", sub55: "rgba(58,46,40,0.62)",
    sub50: "rgba(58,46,40,0.56)", sub45: "rgba(58,46,40,0.5)", sub35: "rgba(58,46,40,0.42)",
    sub30: "rgba(58,46,40,0.36)", sub25: "rgba(58,46,40,0.3)",
    card: "rgba(255,252,246,0.94)", card2: "rgba(255,252,246,0.88)", rowBg: "rgba(58,46,40,0.03)",
    border: "rgba(58,46,40,0.45)", border2: "rgba(58,46,40,0.2)", border3: "rgba(58,46,40,0.6)",
    borderIdle: "rgba(58,46,40,0.35)", inputBorder: "rgba(58,46,40,0.4)",
    chipBg: "rgba(58,46,40,0.08)",
    tray: "rgba(255,252,246,0.7)", inputBg: "#FFF9F0", section: "#5D4037",
    diceShadow: "0 5px 14px rgba(58,46,40,0.35)",
    blankBorder: "rgba(58,46,40,0.4)", blankBg: "rgba(255,255,255,0.5)", blankText: "rgba(58,46,40,0.45)",
    green: "#3D8B37", greenBg: "rgba(61,139,55,0.15)",
  },
};
// Per-skin design tokens: not just colours but construction — borders, shadows, type
const CH = "#3A2E28"; // tabletop charcoal
THEMES.dark.font = "'Avenir Next', 'Segoe UI', system-ui, sans-serif";
THEMES.light.font = THEMES.dark.font;
THEMES.tabletop.font = "'Baloo 2', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
// Card borders: hairlines in Classic, die-cut outlines in Tabletop
THEMES.dark.cardBorder = `1px solid ${THEMES.dark.border}`;
THEMES.light.cardBorder = `1px solid ${THEMES.light.border}`;
THEMES.tabletop.cardBorder = `3px solid ${CH}`;
// Card shadows: soft glow vs hard offset (the physical-piece look)
THEMES.dark.cardShadow = "none";
THEMES.light.cardShadow = "none";
THEMES.tabletop.cardShadow = `0 5px 0 rgba(58,46,40,0.35)`;
// Dice construction
THEMES.dark.dieBorder = "none";
THEMES.light.dieBorder = "none";
THEMES.tabletop.dieBorder = `3px solid ${CH}`;
THEMES.tabletop.diceShadow = `0 5px 0 rgba(58,46,40,0.55)`;
// Buttons: pill gradients vs chunky uppercase slabs
THEMES.dark.btnBorder = "none";
THEMES.light.btnBorder = "none";
THEMES.tabletop.btnBorder = `3px solid ${CH}`;
THEMES.dark.btnShadow = "0 6px 20px rgba(247,37,133,0.4)";
THEMES.light.btnShadow = "0 6px 20px rgba(247,37,133,0.4)";
THEMES.tabletop.btnShadow = `0 5px 0 ${CH}`;
THEMES.dark.btnCase = "none";
THEMES.light.btnCase = "none";
THEMES.tabletop.btnCase = "uppercase";
// Wordmark: gradient carnival vs solid charcoal stamp
THEMES.dark.wordmark = null; // null = gradient
THEMES.light.wordmark = null;
THEMES.tabletop.wordmark = CH;
// Per-skin extras: section header text, big button, overlay wash, input placeholder
THEMES.dark.sectionText = THEMES.dark.sub50;
THEMES.light.sectionText = THEMES.light.sub50;
THEMES.tabletop.sectionText = "rgba(251,239,228,0.95)";
THEMES.dark.btn = "linear-gradient(90deg, #F72585, #B5179E)";
THEMES.light.btn = "linear-gradient(90deg, #F72585, #B5179E)";
THEMES.tabletop.btn = "linear-gradient(180deg, #C96650, #B4553F)";
THEMES.dark.overlay = "rgba(10,8,20,0.88)";
THEMES.light.overlay = "rgba(240,236,250,0.94)";
THEMES.tabletop.overlay = "rgba(90,58,42,0.92)";
THEMES.dark.placeholder = "rgba(245,243,250,0.35)";
THEMES.light.placeholder = "rgba(36,30,61,0.4)";
THEMES.tabletop.placeholder = "rgba(58,46,40,0.4)";
// ---------- Neon: electric arcade ----------
// Cyan is structural (rules, borders, the wordmark), magenta is reserved for
// things you can press, so the eye always knows what is a control.
const NEON_CYAN = "#00E5FF";
const NEON_MAGENTA = "#FF00C4";
THEMES.neon = {
  bg: "linear-gradient(180deg, #05040F 0%, #0B0820 55%, #05040F 100%)",
  text: "#EAF6FF",
  sub70: "rgba(234,246,255,0.7)",
  sub60: "rgba(234,246,255,0.6)",
  sub55: "rgba(234,246,255,0.55)",
  sub50: "rgba(234,246,255,0.5)",
  sub45: "rgba(234,246,255,0.45)",
  sub35: "rgba(234,246,255,0.35)",
  sub30: "rgba(234,246,255,0.3)",
  sub25: "rgba(234,246,255,0.25)",
  card: "rgba(0,229,255,0.06)",
  card2: "rgba(0,229,255,0.045)",
  rowBg: "rgba(0,229,255,0.03)",
  border: "rgba(0,229,255,0.35)",
  border2: "rgba(0,229,255,0.22)",
  border3: "rgba(255,0,196,0.55)",
  borderIdle: "rgba(0,229,255,0.28)",
  inputBorder: "rgba(0,229,255,0.3)",
  chipBg: "rgba(0,229,255,0.1)",
  tray: "rgba(0,0,0,0.55)",
  inputBg: "rgba(0,0,0,0.45)",
  section: "rgba(255,0,196,0.14)",
  diceShadow: "0 0 18px rgba(0,229,255,0.75), 0 0 42px rgba(0,229,255,0.3)",
  blankBorder: "rgba(0,229,255,0.3)",
  blankBg: "rgba(0,229,255,0.04)",
  blankText: "rgba(234,246,255,0.3)",
  green: "#39FF9E",
  greenBg: "rgba(57,255,158,0.16)",
};
THEMES.neon.font = THEMES.dark.font;
THEMES.neon.cardBorder = `1px solid ${THEMES.neon.border}`;
THEMES.neon.cardShadow = "0 0 24px rgba(0,229,255,0.12)";
THEMES.neon.dieBorder = `1px solid ${NEON_CYAN}`;
THEMES.neon.btnBorder = `1px solid rgba(255,0,196,0.6)`;
THEMES.neon.btnShadow = "0 0 18px rgba(255,0,196,0.55), 0 0 40px rgba(255,0,196,0.25)";
THEMES.neon.btnCase = "uppercase";
THEMES.neon.btn = `linear-gradient(90deg, ${NEON_MAGENTA}, #7A00FF)`;
THEMES.neon.wordmark = NEON_CYAN;
THEMES.neon.sectionText = "rgba(234,246,255,0.85)";
THEMES.neon.overlay = "rgba(3,2,10,0.92)";
THEMES.neon.placeholder = "rgba(234,246,255,0.32)";

// Die face and pips. Only used when a player has not picked a die colour;
// a chosen colour still wins, so the glow does Neon's work on the dice.
THEMES.dark.dieFace = "linear-gradient(160deg, #FFFFFF, #E8E6F0)";
THEMES.light.dieFace = THEMES.dark.dieFace;
THEMES.tabletop.dieFace = THEMES.dark.dieFace;
THEMES.neon.dieFace = "linear-gradient(160deg, #12122A, #05040F)";
THEMES.dark.diePip = "#1B1730";
THEMES.light.diePip = "#1B1730";
THEMES.tabletop.diePip = "#1B1730";
THEMES.neon.diePip = NEON_CYAN;

// Player die colours are stored as a hex on the player and saved into resumed
// games, so a skin cannot change COLOUR_CHOICES itself without stranding saved
// games on a colour the picker no longer offers. Instead each skin may remap
// the six at render time. null means "use the colour as chosen".
THEMES.dark.dieColours = null;
THEMES.light.dieColours = null;
THEMES.tabletop.dieColours = null;
THEMES.neon.dieColours = {
  "#FF5A5F": "#FF2E63", // Red
  "#4CC9F0": "#00E5FF", // Blue
  "#FFA62B": "#FF9F1C", // Orange
  "#FFD23F": "#FFE347", // Yellow
  "#80ED99": "#39FF9E", // Green
  "#B388FF": "#B14BFF", // Purple
};

// When true, a die's halo takes the die's own colour instead of diceShadow —
// a red die becomes a red tube rather than a red object under a cyan light.
// Player names pick up the same glow.
THEMES.dark.colourGlow = false;
THEMES.light.colourGlow = false;
THEMES.tabletop.colourGlow = false;
THEMES.neon.colourGlow = true;

// Display face, for the wordmark only. Audiowide ships a single weight (400);
// the h1 asks for 900, so the browser synthesises the bold. The body keeps a
// system stack so the stats table's tabular figures stay legible at 13px.
THEMES.dark.displayFont = THEMES.dark.font;
THEMES.light.displayFont = THEMES.light.font;
THEMES.tabletop.displayFont = THEMES.tabletop.font;
THEMES.neon.displayFont = `'Audiowide', ${THEMES.dark.font}`;

// Wordmark shadow: Tabletop stamps it, Neon lights it, the rest use a gradient
THEMES.tabletop.wordmarkShadow = "0 4px 0 rgba(58,46,40,0.22)";
THEMES.neon.wordmarkShadow = "0 0 12px rgba(0,229,255,0.75), 0 0 34px rgba(0,229,255,0.4)";

// ---------- Casino: green baize, gold hairlines, red felt ----------
// Gold is a hairline colour only, never a fill, which is the whole difference
// between classy and gaudy. The buttons are felt red with a gold edge.
const CASINO_GOLD = "#C9A85A";
const CASINO_FELT = "#8B1E26";
THEMES.casino = {
  bg: "linear-gradient(180deg, #0F5132 0%, #0B3D26 55%, #0F5132 100%)",
  text: "#F6F1E3",
  sub70: "rgba(246,241,227,0.72)",
  sub60: "rgba(246,241,227,0.64)",
  sub55: "rgba(246,241,227,0.58)",
  sub50: "rgba(246,241,227,0.52)",
  sub45: "rgba(246,241,227,0.48)",
  sub35: "rgba(246,241,227,0.4)",
  sub30: "rgba(246,241,227,0.32)",
  sub25: "rgba(246,241,227,0.28)",
  card: "rgba(6,32,20,0.55)",
  card2: "rgba(6,32,20,0.42)",
  rowBg: "rgba(246,241,227,0.03)",
  border: "rgba(201,168,90,0.45)",
  border2: "rgba(201,168,90,0.28)",
  border3: "rgba(201,168,90,0.7)",
  borderIdle: "rgba(201,168,90,0.35)",
  inputBorder: "rgba(201,168,90,0.4)",
  chipBg: "rgba(201,168,90,0.14)",
  tray: "rgba(4,24,15,0.5)",
  inputBg: "rgba(4,24,15,0.55)",
  section: "rgba(139,30,38,0.5)",
  diceShadow: "0 6px 14px rgba(0,0,0,0.45)",
  blankBorder: "rgba(201,168,90,0.35)",
  blankBg: "rgba(246,241,227,0.04)",
  blankText: "rgba(246,241,227,0.35)",
  green: "#9BE8B4", // a green highlight on green baize is invisible, so this lifts
  greenBg: "rgba(155,232,180,0.16)",
};
THEMES.casino.font = THEMES.dark.font;
THEMES.casino.cardBorder = `1px solid ${THEMES.casino.border}`;
THEMES.casino.cardShadow = "0 2px 10px rgba(0,0,0,0.35)";
THEMES.casino.dieBorder = `1px solid rgba(201,168,90,0.5)`;
THEMES.casino.btnBorder = `1px solid rgba(201,168,90,0.65)`;
THEMES.casino.btnShadow = "0 4px 14px rgba(0,0,0,0.4)";
THEMES.casino.btnCase = "none"; // classy, not shouty
THEMES.casino.btn = `linear-gradient(180deg, ${CASINO_FELT}, #6E1720)`;
THEMES.casino.wordmark = CASINO_GOLD;
THEMES.casino.sectionText = "rgba(246,241,227,0.92)";
THEMES.casino.overlay = "rgba(4,20,13,0.92)";
THEMES.casino.placeholder = "rgba(246,241,227,0.38)";
THEMES.casino.dieFace = "linear-gradient(160deg, #FFFDF6, #F1EADA)"; // bone, not white
THEMES.casino.diePip = "#20301F";
THEMES.casino.dieColours = null;
THEMES.casino.colourGlow = false;
THEMES.casino.displayFont = THEMES.casino.font; // no webfont: the gold does the talking
THEMES.casino.wordmarkShadow = "0 2px 4px rgba(0,0,0,0.45)";


// ---------- The Resistance: light side ----------
// A used-universe palette: bone canvas, slate panels, burnt orange for anything
// that acts. Accents borrowed from modelling-paint colours — dust, rust, olive.
const RES_ORANGE = "#DB4E1B";
const RES_SLATE = "#3F454C";
const RES_INK = "#2A2F35";
THEMES.resistance = {
  bg: "linear-gradient(180deg, #F3EFE5 0%, #E5DFD1 55%, #F3EFE5 100%)",
  text: RES_INK,
  sub70: "rgba(42,47,53,0.76)",
  sub60: "rgba(42,47,53,0.66)",
  sub55: "rgba(42,47,53,0.6)",
  sub50: "rgba(42,47,53,0.54)",
  sub45: "rgba(42,47,53,0.48)",
  sub35: "rgba(42,47,53,0.4)",
  sub30: "rgba(42,47,53,0.34)",
  sub25: "rgba(42,47,53,0.28)",
  card: "rgba(255,253,247,0.9)",
  card2: "rgba(255,253,247,0.78)",
  rowBg: "rgba(42,47,53,0.03)",
  border: "rgba(63,69,76,0.22)",
  border2: "rgba(63,69,76,0.13)",
  border3: "rgba(219,78,27,0.8)",
  borderIdle: "rgba(63,69,76,0.3)",
  inputBorder: "rgba(63,69,76,0.26)",
  chipBg: "rgba(219,78,27,0.1)",
  tray: "rgba(211,190,150,0.38)",
  inputBg: "#FFFDF8",
  section: RES_SLATE,
  diceShadow: "0 4px 12px rgba(42,47,53,0.22)",
  blankBorder: "rgba(63,69,76,0.3)",
  blankBg: "rgba(63,69,76,0.05)",
  blankText: "rgba(42,47,53,0.4)",
  green: "#3F7A5E",
  greenBg: "rgba(63,122,94,0.14)",
};
THEMES.resistance.font = THEMES.dark.font;
THEMES.resistance.cardBorder = `1px solid ${THEMES.resistance.border}`;
THEMES.resistance.cardShadow = "0 2px 8px rgba(42,47,53,0.1)";
THEMES.resistance.dieBorder = `1px solid rgba(63,69,76,0.28)`;
THEMES.resistance.btnBorder = "none";
THEMES.resistance.btnShadow = "0 5px 14px rgba(219,78,27,0.35)";
THEMES.resistance.btnCase = "uppercase";
THEMES.resistance.btn = `linear-gradient(90deg, ${RES_ORANGE}, #B23F14)`;
THEMES.resistance.wordmark = RES_ORANGE;
THEMES.resistance.wordmarkShadow = "0 2px 0 rgba(63,69,76,0.28)";
THEMES.resistance.sectionText = "rgba(243,239,229,0.95)";
THEMES.resistance.overlay = "rgba(243,239,229,0.95)";
THEMES.resistance.placeholder = "rgba(42,47,53,0.4)";
THEMES.resistance.dieFace = "linear-gradient(160deg, #FFFDF8, #EFE9DB)";
THEMES.resistance.diePip = RES_INK;
THEMES.resistance.displayFont = `'Audiowide', ${THEMES.dark.font}`;
// Dusty rather than bright: the six taken down to modelling-paint tones so they
// sit in the world instead of on top of it. Same names, same order.
THEMES.resistance.dieColours = {
  "#FF5A5F": "#C0492B", // rust
  "#4CC9F0": "#5E86A8", // fleet blue
  "#FFA62B": "#E58A2E", // flight suit
  "#FFD23F": "#C9A227", // ochre
  "#80ED99": "#3F7A5E", // squadron green
  "#B388FF": "#7A5C8A", // dusty plum
};
THEMES.resistance.colourGlow = false; // a halo on a pale ground reads as smudge

// A panel behind the name rows in the lobby. null leaves the rows on the card,
// which is what every other skin wants; Resistance insets them into slate so
// the lobby has some structure instead of white cards on a warm ground.
THEMES.dark.rosterBand = null;
THEMES.light.rosterBand = null;
THEMES.tabletop.rosterBand = null;
THEMES.neon.rosterBand = null;
THEMES.casino.rosterBand = null;
THEMES.resistance.rosterBand = "rgba(63,69,76,0.94)";

// Held dice. Gold is right where it is the house colour, so the five existing
// skins keep it exactly; Resistance clamps in ink instead, because gold makes a
// third warm colour against rust and burnt orange.
const HELD_GOLD = { ring: "#FFD23F", halo: "rgba(255,166,43,0.45)", face: "linear-gradient(160deg, #FFD23F, #FFA62B)" };
THEMES.dark.held = HELD_GOLD;
THEMES.light.held = HELD_GOLD;
THEMES.tabletop.held = HELD_GOLD;
THEMES.neon.held = HELD_GOLD;
THEMES.casino.held = HELD_GOLD;
THEMES.resistance.held = {
  ring: RES_INK,
  halo: "rgba(42,47,53,0.5)",
  face: "linear-gradient(160deg, #3F454C, #2A2F35)",
}; // a halo on a pale ground reads as smudge

const SKIN_ORDER = ["dark", "light", "tabletop", "neon", "casino", "resistance"];
let T = THEMES.dark;


// ---------- Two-colour icons ----------
const SunIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <g stroke="#FFA62B" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="1.5" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22.5" y2="12" />
      <line x1="4.6" y1="4.6" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.4" y2="19.4" />
      <line x1="4.6" y1="19.4" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.4" y2="4.6" />
    </g>
    <circle cx="12" cy="12" r="5" fill="#FFD23F" stroke="#FFA62B" strokeWidth="1.5" />
  </svg>
);
const BoltIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M13.4 2 5.6 13.2h5.1L9.9 22l8.2-11.6h-5.3L13.4 2Z"
      fill="#00E5FF"
      stroke="#FF00C4"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
const ChipIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.2" fill="#8B1E26" stroke="#C9A85A" strokeWidth="1.6" />
    <g fill="#C9A85A">
      <rect x="11" y="3.4" width="2" height="3" rx="0.6" />
      <rect x="11" y="17.6" width="2" height="3" rx="0.6" />
      <rect x="3.4" y="11" width="3" height="2" rx="0.6" />
      <rect x="17.6" y="11" width="3" height="2" rx="0.6" />
    </g>
    <circle cx="12" cy="12" r="4.4" fill="none" stroke="#F6F1E3" strokeWidth="1.3" />
  </svg>
);
const MoonIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
      fill="#B388FF"
      stroke="#7C5CBF"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="17" cy="6" r="1.1" fill="#7C5CBF" />
    <circle cx="20.5" cy="9.5" r="0.7" fill="#7C5CBF" />
  </svg>
);
const BoardIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" fill="#FBEFE4" stroke="#3A2E28" strokeWidth="1.6" />
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.5" fill="#FFD23F" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="2.5" fill="#4CC9F0" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="2.5" fill="#FF5A5F" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="2.5" fill="#80ED99" />
  </svg>
);
const BotIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <line x1="12" y1="2" x2="12" y2="5" stroke="#2E9CC4" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="2.4" r="1.4" fill="#2E9CC4" />
    <rect x="4" y="5" width="16" height="13" rx="3.5" fill="#4CC9F0" stroke="#2E9CC4" strokeWidth="1.5" />
    <circle cx="9" cy="11" r="1.7" fill="#17324A" />
    <circle cx="15" cy="11" r="1.7" fill="#17324A" />
    <rect x="8.5" y="14.2" width="7" height="1.8" rx="0.9" fill="#17324A" />
    <rect x="1.5" y="9.5" width="2" height="4.5" rx="1" fill="#2E9CC4" />
    <rect x="20.5" y="9.5" width="2" height="4.5" rx="1" fill="#2E9CC4" />
  </svg>
);


// ---------- iOS shake-to-undo mitigation ----------
// iOS offers "Undo Typing" on shake if the page has any text-undo history.
// Typing names on the setup screen creates that history, so we drain it when
// the game starts and swallow undo events during play.
const purgeUndoStack = () => {
  try {
    if (typeof document === "undefined") return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.removeAllRanges) sel.removeAllRanges();
    const el = document.createElement("input");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;top:-200px;left:0;opacity:0;height:1px;width:1px;";
    document.body.appendChild(el);
    el.focus();
    for (let i = 0; i < 50; i++) {
      try { document.execCommand("undo"); } catch {}
    }
    el.blur();
    document.body.removeChild(el);
  } catch {}
};

// ---------- Confetti ----------
const CONFETTI_COLOURS = ["#FFD23F", "#4CC9F0", "#F72585", "#80ED99", "#B5179E", "#FFA62B"];
function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        duration: 2.6 + Math.random() * 2.4,
        size: 7 + Math.random() * 7,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        spin: Math.random() > 0.5 ? 1 : -1,
        shape: Math.random() > 0.5 ? "50%" : "2px",
      })),
    []
  );
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-4vh",
            left: `${p.left}vw`,
            width: p.size,
            height: p.size * 0.6,
            background: skinColour(p.colour),
            borderRadius: p.shape,
            animation: `confettiFall ${p.duration}s linear ${p.delay}s infinite`,
            "--spin": p.spin,
          }}
        />
      ))}
    </div>
  );
}


// The chosen colour, translated for the current skin. Every read of a player's
// colour goes through this, so saved games keep their stored hex and only the
// rendering changes.
const skinColour = (hex) => (hex && T.dieColours && T.dieColours[hex]) || hex;

// A halo in the colour itself, for skins that ask for it. Returns null so
// callers can fall back to whatever they used before.
const colourGlowFor = (hex, strength = 1) =>
  T.colourGlow && hex
    ? `0 0 ${10 * strength}px ${hex}, 0 0 ${26 * strength}px ${hex}99`
    : null;

// Choose dark or light pips depending on how bright the die colour is
const pipColourFor = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#17132B" : "#FFFFFF";
};

function Die({ value, held, onClick, rolling, disabled, blank, colour, size = 58 }) {
  if (blank) {
    return (
      <div
        aria-label="Die not yet rolled"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          border: `2px dashed ${T.blankBorder}`,
          background: T.blankBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.blankText,
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        ?
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Die showing ${value}${held ? ", held" : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        border: held && T.dieBorder !== "none" ? `3px solid ${T.held.ring}` : T.dieBorder,
        background: colour
          ? skinColour(colour)
          : held
          ? T.held.face
          : T.dieFace,
        boxShadow: held
          ? `0 0 0 4px ${T.held.ring}, 0 6px 16px ${T.held.halo}`
          : colourGlowFor(skinColour(colour)) || T.diceShadow,
        cursor: disabled ? "default" : "pointer",
        padding: 8,
        transform: held ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
        animation: rolling && !held ? "tumble 0.45s ease" : "none",
        outlineOffset: 3,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          width: "100%",
          height: "100%",
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const show = PIP_LAYOUTS[value].some(([pr, pc]) => pr === r && pc === c);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {show && (
                <div
                  style={{
                    width: Math.max(8, Math.round(size * 0.16)),
                    height: Math.max(8, Math.round(size * 0.16)),
                    borderRadius: "50%",
                    background: colour ? pipColourFor(skinColour(colour)) : T.diePip,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}


// Just enough markdown for the README: headers, bold, horizontal rules, paragraphs
const Md = ({ text }) => {
  const bold = (line, key) => {
    const parts = line.split("**");
    return (
      <span key={key}>
        {parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}
      </span>
    );
  };
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  text.split("\n").forEach((line) => {
    const t = line.trim();
    if (t.startsWith("## ")) { flush(); blocks.push({ type: "h2", text: t.slice(3) }); }
    else if (t.startsWith("# ")) { flush(); blocks.push({ type: "h1", text: t.slice(2) }); }
    else if (t === "---") { flush(); blocks.push({ type: "hr" }); }
    else if (t === "") flush();
    else para.push(t);
  });
  flush();
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "h1" ? (
          <div key={i} style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 10px", color: T.text }}>{bold(b.text, i)}</div>
        ) : b.type === "h2" ? (
          <div key={i} style={{ fontSize: 16, fontWeight: 800, margin: "16px 0 6px", color: T.text }}>{bold(b.text, i)}</div>
        ) : b.type === "hr" ? (
          <div key={i} style={{ borderTop: `1px solid ${T.border}`, margin: "14px 0" }} />
        ) : (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: T.sub70, margin: "0 0 10px" }}>{bold(b.text, i)}</p>
        )
      )}
    </>
  );
};

// ---------- Main app ----------
export default function Fahtzee() {
  const [skin, setSkin] = useState(() => {
    try {
      const s = window.localStorage.getItem("fahtzee-skin");
      return SKIN_ORDER.includes(s) ? s : "dark";
    } catch { return "dark"; }
  });
  T = THEMES[skin];
  const cycleSkin = () => {
    const next = SKIN_ORDER[(SKIN_ORDER.indexOf(skin) + 1) % SKIN_ORDER.length];
    setSkin(next);
    try { window.localStorage.setItem("fahtzee-skin", next); } catch {}
  };
  const [soundOn, setSoundOn] = useState(true);
  setSoundEnabled(soundOn);
  const [addBot, setAddBot] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [readme, setReadme] = useState(null); // null = closed, "loading", or content
  const [history, setHistory] = useState(() => loadHistory());
  const [tally, setTally] = useState(() => loadTally());
  const recordedRef = useRef(false);
  const announcedRef = useRef(false);
  const [undoSnap, setUndoSnap] = useState(null);
  const [savedGame, setSavedGame] = useState(() => loadCurrentGame());
  const [aiLevel, setAiLevel] = useState(1);
  const gameIdRef = useRef(0);
  // phase: "setup" | "handoff" | "playing" | "over"
  const [phase, setPhase] = useState("setup");
  const [nameInputs, setNameInputs] = useState(["", "", "", ""]);
  const [colourPicks, setColourPicks] = useState([0, 1, 2, 4]); // red, blue, orange, green
  const cycleColour = (row) => {
    setColourPicks((picks) => {
      const taken = new Set(picks.filter((_, i) => i !== row));
      let next = picks[row];
      do { next = (next + 1) % COLOUR_CHOICES.length; } while (taken.has(next));
      return picks.map((p, i) => (i === row ? next : p));
    });
  };
  const [players, setPlayers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [round, setRound] = useState(1);

  const [dice, setDice] = useState([1, 1, 1, 1, 1]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);

  // Tie-break roll-off
  const [rolloff, setRolloff] = useState(null); // { contenders: [playerIdx], results: {idx: best}, rollsTaken: {idx: n} }
  const [rolloffDice, setRolloffDice] = useState(null);
  const [rolloffRolling, setRolloffRolling] = useState(false);

  // Shake to roll
  const [shakeStatus, setShakeStatus] = useState("unknown"); // unknown | needsPermission | on | unavailable
  const lastShakeRef = useRef(0);
  const stateRef = useRef({});
  stateRef.current = { phase, rollsLeft, rolling };
  const gameRef = useRef({});
  gameRef.current = { dice, players, current, rollsLeft, phase, rolling };

  const hasRolled = rollsLeft < 3;
  const player = players[current];

  const doRoll = useCallback(() => {
    play("rattle");
    haptic([12, 25, 10, 30, 8, 40, 6]);
    setRolling(true);
    const gid = gameIdRef.current;
    let ticks = 0;
    const interval = setInterval(() => {
      if (gameIdRef.current !== gid) {
        // Game was undone or restarted mid-roll: stand down without side effects
        clearInterval(interval);
        setRolling(false);
        return;
      }
      setDice((prev) => prev.map((d, i) => (held[i] ? d : 1 + Math.floor(Math.random() * 6))));
      ticks++;
      if (ticks >= 7) {
        clearInterval(interval);
        setRolling(false);
        setRollsLeft((r) => r - 1);
      }
    }, 60);
  }, [held]);

  const roll = useCallback(() => {
    if (rollsLeft === 0 || rolling || phase !== "playing") return;
    doRoll();
  }, [rollsLeft, rolling, phase, doRoll]);

  const rollRef = useRef(roll);
  rollRef.current = roll;

  const handleMotion = useCallback((e) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const magnitude = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    // Gravity alone is ~9.8; a real shake spikes well past 22
    if (magnitude > 24) {
      const now = Date.now();
      const { phase: ph, rollsLeft: rl, rolling: ro } = stateRef.current;
      const cur = gameRef.current;
      const isBotTurn = cur.players && cur.players[cur.current] && cur.players[cur.current].isBot;
      if (now - lastShakeRef.current > 1400 && ph === "playing" && rl > 0 && !ro && !isBotTurn) {
        lastShakeRef.current = now;
        rollRef.current();
      }
    }
  }, []);

  // Swallow any text-undo the system tries to perform mid-game
  useEffect(() => {
    if (typeof window === "undefined") return;
    const swallowUndo = (e) => {
      if (e.inputType === "historyUndo" && stateRef.current.phase !== "setup") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeinput", swallowUndo, true);
    return () => window.removeEventListener("beforeinput", swallowUndo, true);
  }, []);

  useEffect(() => {
    if (phase === "playing") purgeUndoStack();
  }, [phase, current]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.DeviceMotionEvent === "undefined") {
      setShakeStatus("unavailable");
      return;
    }
    if (typeof window.DeviceMotionEvent.requestPermission === "function") {
      // iOS: needs a user gesture to grant
      setShakeStatus("needsPermission");
    } else {
      window.addEventListener("devicemotion", handleMotion);
      setShakeStatus("on");
    }
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);

  const enableShake = async () => {
    try {
      const res = await window.DeviceMotionEvent.requestPermission();
      if (res === "granted") {
        window.addEventListener("devicemotion", handleMotion);
        setShakeStatus("on");
      } else {
        setShakeStatus("unavailable");
      }
    } catch {
      setShakeStatus("unavailable");
    }
  };

  const startGame = () => {
    const roster = [];
    nameInputs.forEach((n, i) => {
      const name = n.trim();
      if (name) roster.push({ name, colour: COLOUR_CHOICES[colourPicks[i]].hex, scores: {}, yahtzeeBonuses: 0, isBot: false });
    });
    if (addBot && roster.length < 4) {
      const used = new Set(roster.map((p) => p.colour));
      const botColour = COLOUR_CHOICES.find((c) => !used.has(c.hex)) || COLOUR_CHOICES[5];
      const bot = { name: "AI", colour: botColour.hex, scores: {}, yahtzeeBonuses: 0, isBot: true, level: aiLevel };
      // Solo game: AI goes first, so the human always knows what they're chasing
      if (roster.length === 1) roster.unshift(bot);
      else roster.push(bot);
    }
    if (roster.length < 2) return;
    loadSamples();
    gameIdRef.current++;
    clearCurrentGame();
    setSavedGame(null);
    setUndoSnap(null);
    recordedRef.current = false;
    announcedRef.current = false;
    purgeUndoStack();
    setPlayers(roster);
    setCurrent(0);
    setRound(1);
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);
    setPhase("handoff");
  };

  const toggleHold = (i) => {
    if (!hasRolled) return;
    play("hold");
    haptic(8);
    setHeld((h) => h.map((v, j) => (j === i ? !v : v)));
  };

  const scoreCategory = (key) => {
    if (!player || player.scores[key] !== undefined || !hasRolled || rolling) return;
    let pts = SCORERS[key](dice);
    let bonus = 0;
    const isFive = counts(dice).some((c) => c === 5);
    if (isFive && player.scores.fahtzee === 50 && key !== "fahtzee") {
      bonus = 1;
      if (key === "fullHouse") pts = 25;
      if (key === "smallStraight") pts = 30;
      if (key === "largeStraight") pts = 40;
    }
    setUndoSnap({ players, current, round, dice: [...dice], held: [...held], rollsLeft });
    const isFahtzeeMoment = (key === "fahtzee" && pts === 50) || bonus > 0;
    play(isFahtzeeMoment ? "fahtzee" : "bank");
    haptic(isFahtzeeMoment ? [30, 50, 30, 50, 90] : 15);
    if (isFahtzeeMoment) setTimeout(sayFahtzee, 450);
    // The AI has opinions
    const anyBot = players.some((p) => p.isBot);
    if (player.isBot && pts >= 25 && Math.random() < 0.35) {
      setTimeout(() => say(pick(AI_SMUG), { pitch: 0.8, rate: 0.9 }), isFahtzeeMoment ? 1600 : 700);
    } else if (!player.isBot && anyBot && isFahtzeeMoment && Math.random() < 0.6) {
      setTimeout(() => say(pick(AI_GRUDGING), { pitch: 0.8, rate: 0.9 }), 1900);
    }
    const updated = players.map((p, i) =>
      i === current
        ? { ...p, scores: { ...p.scores, [key]: pts }, yahtzeeBonuses: p.yahtzeeBonuses + bonus }
        : p
    );
    setPlayers(updated);
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);

    const next = (current + 1) % updated.length;
    const finished = updated.every((p) => Object.keys(p.scores).length === 13);
    if (finished) {
      setPhase("over");
    } else {
      if (next === 0) setRound((r) => r + 1);
      setCurrent(next);
      setPhase("handoff");
    }
  };

  const scoreCatRef = useRef();
  scoreCatRef.current = scoreCategory;

  // The AI's turn engine
  const botBusyRef = useRef(false);
  useEffect(() => {
    const p = players[current];
    if (!p || !p.isBot || phase === "over" || phase === "setup") return;
    if (phase === "handoff") {
      const t = setTimeout(() => setPhase("playing"), 1100);
      return () => clearTimeout(t);
    }
    if (phase === "playing" && !botBusyRef.current) {
      botBusyRef.current = true;
      const gid = gameIdRef.current;
      const live = () => gameIdRef.current === gid && gameRef.current.phase === "playing";
      const level = p.level ?? 1;
      (async () => {
        try {
          for (let r = 0; r < 3; r++) {
            await sleep(500);
            if (!live()) return;
            rollRef.current();
            await sleep(650);
            while (gameRef.current.rolling) {
              if (gameIdRef.current !== gid) return;
              await sleep(80);
            }
            if (!live()) return;
            const { dice: d, players: ps, current: cur } = gameRef.current;
            const scores = ps[cur].scores;
            if (r < 2 && !botShouldStop(d, scores, level)) {
              setHeld(botChooseHolds(d, scores, level));
              await sleep(800);
              if (!live()) return;
            } else {
              break;
            }
          }
          await sleep(600);
          if (!live()) return;
          const { dice: d, players: ps, current: cur } = gameRef.current;
          scoreCatRef.current(botChooseCategory(d, ps[cur].scores, level));
        } finally {
          botBusyRef.current = false;
        }
      })();
    }
  }, [phase, current, players]);

  const undoLast = () => {
    if (!undoSnap) return;
    gameIdRef.current++;           // cancels any in-flight AI turn and roll animation
    botBusyRef.current = false;
    setRolling(false);
    setPlayers(undoSnap.players);
    setCurrent(undoSnap.current);
    setRound(undoSnap.round);
    setDice(undoSnap.dice);
    setHeld(undoSnap.held);
    setRollsLeft(undoSnap.rollsLeft);
    setRolloff(null);
    setRolloffDice(null);
    recordedRef.current = false;
    announcedRef.current = false;
    setUndoSnap(null);
    setPhase("playing");
  };

  const resumeGame = () => {
    const g = loadCurrentGame();
    if (!g) { setSavedGame(null); return; }
    loadSamples();
    gameIdRef.current++;
    botBusyRef.current = false;
    setPlayers(g.players);
    setCurrent(g.current);
    setRound(g.round);
    setDice(g.dice);
    setHeld(g.held);
    setRollsLeft(g.rollsLeft);
    setUndoSnap(null);
    recordedRef.current = false;
    announcedRef.current = false;
    setSavedGame(null);
    setPhase("handoff");
  };

  const openReadme = () => {
    setReadme("loading");
    if (typeof fetch === "undefined") {
      setReadme("__unavailable__");
      return;
    }
    // Unique query + no-store defeats both the service worker cache and the CDN cache,
    // so the notes are always today's notes
    fetch(`README.md?fresh=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setReadme(text))
      .catch(() => setReadme("__unavailable__"));
  };

  const discardSaved = () => {
    clearCurrentGame();
    setSavedGame(null);
  };

  // Auto-save the game after every move; clear it when the game ends
  useEffect(() => {
    if (phase === "handoff" || phase === "playing") {
      saveCurrentGame({ players, current, round, dice, held, rollsLeft });
    } else if (phase === "over") {
      clearCurrentGame();
    }
  }, [phase, players, current, round, dice, held, rollsLeft]);

  const newGame = () => {
    if (phase === "over" && !recordedRef.current && players.length > 0) {
      // Roll-off never settled: record it as a shared win
      const totals = players.map((p) => totalsFor(p).grand);
      const top = Math.max(...totals);
      const results = players.map((p) => ({ name: p.name, total: totalsFor(p).grand, isBot: !!p.isBot }));
      recordGame({
        date: new Date().toISOString(),
        results,
        winners: players.filter((_, i) => totals[i] === top).map((p) => p.name),
      });
      recordedRef.current = true;
    }
    setPhase("setup");
    setHistory(loadHistory());
    setTally(loadTally());
    setSavedGame(loadCurrentGame());
    setUndoSnap(null);
    setPlayers([]);
    setRolloff(null);
    setRolloffDice(null);
    setRolloffRolling(false);
  };

  // ---------- Roll-off machinery: three rolls each, highest counts ----------
  const ROLLOFF_ROLLS = 3;
  const rolloffNext = rolloff
    ? rolloff.contenders.find((c) => (rolloff.rollsTaken[c] || 0) < ROLLOFF_ROLLS)
    : undefined;

  const startRolloff = (contenders) => {
    // In solo play the AI rolls first here too
    const humans = players.filter((p) => !p.isBot);
    const ordered = humans.length === 1
      ? [...contenders].sort((a, b) => (players[b].isBot ? 1 : 0) - (players[a].isBot ? 1 : 0))
      : contenders;
    setRolloff({ contenders: ordered, results: {}, rollsTaken: {} });
    setRolloffDice(null);
  };

  const rollForContender = (cIdx) => {
    if (rolloffRolling) return;
    setRolloffRolling(true);
    const gid = gameIdRef.current;
    let ticks = 0;
    const interval = setInterval(() => {
      if (gameIdRef.current !== gid) { clearInterval(interval); setRolloffRolling(false); return; }
      const vals = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
      setRolloffDice(vals);
      ticks++;
      if (ticks >= 7) {
        clearInterval(interval);
        const s = vals.reduce((a, b) => a + b, 0);
        setRolloff((r) => r && ({
          ...r,
          results: { ...r.results, [cIdx]: Math.max(r.results[cIdx] ?? 0, s) },
          rollsTaken: { ...r.rollsTaken, [cIdx]: (r.rollsTaken[cIdx] || 0) + 1 },
        }));
        setRolloffRolling(false);
      }
    }, 60);
  };

  // The AI takes its roll-off turns by itself
  useEffect(() => {
    if (phase !== "over" || !rolloff || rolloffRolling) return;
    if (rolloffNext === undefined) return;
    if (!players[rolloffNext] || !players[rolloffNext].isBot) return;
    const gid = gameIdRef.current;
    const t = setTimeout(() => {
      if (gameIdRef.current === gid) rollForContender(rolloffNext);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, rolloff, rolloffRolling, rolloffNext, players]);

  // Once a definitive winner exists (outright, or after the roll-off):
  // fanfare, record the game exactly once, and announce the result
  useEffect(() => {
    if (phase !== "over" || recordedRef.current || players.length === 0) return;
    const totals = players.map((p) => totalsFor(p).grand);
    const top = Math.max(...totals);
    const topIdxs = players.map((_, i) => i).filter((i) => totals[i] === top);
    let winnerIdx = null;
    if (topIdxs.length === 1) {
      winnerIdx = topIdxs[0];
    } else if (rolloff) {
      const done = rolloff.contenders.every((c) => (rolloff.rollsTaken[c] || 0) >= ROLLOFF_ROLLS);
      if (done) {
        const max = Math.max(...rolloff.contenders.map((c) => rolloff.results[c]));
        const still = rolloff.contenders.filter((c) => rolloff.results[c] === max);
        if (still.length === 1) winnerIdx = still[0];
      }
    }
    if (winnerIdx === null) return; // tie not yet settled by the roll-off
    recordedRef.current = true;
    play("win");
    haptic([20, 40, 20, 40, 120]);
    const winner = players[winnerIdx];
    const results = players.map((p) => ({ name: p.name, total: totalsFor(p).grand, isBot: !!p.isBot }));
    if (recordGame({ date: new Date().toISOString(), results, winners: [winner.name] })) {
      setHistory(loadHistory());
      setTally(loadTally());
    }
    const humans = players.filter((p) => !p.isBot);
    const solo = humans.length === 1;
    let line;
    if (solo) {
      line = winner.isBot ? pick(SOLO_LOSS)(humans[0].name) : pick(SOLO_WIN)(winner.name);
    } else {
      const losers = nameList(players.filter((p) => p !== winner && !p.isBot).map((p) => p.name));
      line = winner.isBot ? pick(AI_WINS_LOCAL)(losers) : pick(LOCAL_WIN)(winner.name, losers);
    }
    setTimeout(() => say(line), 1300);
  }, [phase, players, rolloff]);

  // ---------- Shared shell ----------
  const shell = (children) => (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "22px 12px 48px",
        color: T.text,
      }}
    >
      <style>{`
        @keyframes tumble {
          0% { transform: rotate(0deg) scale(1); }
          30% { transform: rotate(-16deg) scale(1.1); }
          60% { transform: rotate(12deg) scale(0.94); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(115vh) rotate(calc(var(--spin) * 720deg)); opacity: 0.7; }
        }
        @keyframes pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        button:focus-visible, input:focus-visible { outline: 3px solid #FFD23F; }
        input::placeholder { color: ${T.placeholder}; }
      `}</style>
      <h1
        style={{
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          margin: "0 0 2px",
          transform: skin === "neon" ? "none" : "rotate(-2deg)",
          fontFamily: T.displayFont,
          ...(T.wordmark
            ? { color: T.wordmark, textShadow: T.wordmarkShadow }
            : {
                background: "linear-gradient(90deg, #FFD23F, #F72585, #4CC9F0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }),
        }}
      >
        FAHTZEE
      </h1>
      <button
        onClick={cycleSkin}
        aria-label="Change skin: Classic dark, Classic light, Tabletop, Neon, Casino, or The Resistance"
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: T.dieBorder === "none" ? `1px solid ${T.border3}` : T.dieBorder,
          background: T.card,
          fontSize: 19,
          cursor: "pointer",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {skin === "dark" ? <SunIcon size={22} /> : skin === "light" ? <BoardIcon size={22} /> : skin === "tabletop" ? <BoltIcon size={22} /> : skin === "neon" ? <ChipIcon size={22} /> : skin === "casino" ? <span role="img" aria-hidden="true" style={{ fontSize: 21, lineHeight: 1 }}>✨</span> : <MoonIcon size={22} />}
      </button>
      <button
        onClick={() => setSoundOn((s) => !s)}
        aria-label="Toggle sound"
        style={{
          position: "fixed",
          top: 64,
          right: 14,
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: T.dieBorder === "none" ? `1px solid ${T.border3}` : T.dieBorder,
          background: T.card,
          fontSize: 17,
          cursor: "pointer",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>
      {children}
      {readme !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: T.overlay,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "18px 14px",
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: T.text }}>Release notes · {VERSION}</div>
              <button
                onClick={() => setReadme(null)}
                aria-label="Close release notes"
                style={{
                  fontFamily: "inherit",
                  fontSize: 15,
                  fontWeight: 800,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: `1px solid ${T.border3}`,
                  background: T.card,
                  color: T.text,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            {readme === "loading" ? (
              <div style={{ color: T.sub55, fontSize: 14, padding: "20px 0" }}>Fetching the latest notes…</div>
            ) : readme === "__unavailable__" ? (
              <div style={{ color: T.sub55, fontSize: 14, padding: "20px 0" }}>
                Couldn't fetch the notes just now. They live in the repo as README.md, and load here when the game is
                played from its website.
              </div>
            ) : (
              <Md text={readme} />
            )}
          </div>
        </div>
      )}
    </div>
  );

  const bigButton = (label, onClick, disabled) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "inherit",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: T.btnCase === "uppercase" ? "0.08em" : "0.02em",
        textTransform: T.btnCase,
        padding: "14px 42px",
        borderRadius: 16,
        border: disabled ? "none" : T.btnBorder,
        background: disabled ? T.border2 : T.btn,
        color: disabled ? T.sub35 : "#FFF",
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : T.btnShadow,
        transition: "transform 0.1s ease",
      }}
    >
      {label}
    </button>
  );

  // ---------- Setup screen ----------
  if (phase === "setup") {
    const namedCount = nameInputs.filter((n) => n.trim()).length;
    return shell(
      <>
        <p style={{ color: T.sub60, margin: "4px 0 24px", fontSize: 14, maxWidth: "calc(100% - 120px)", textAlign: "center" }}>
          Pass and play · enter 2 to 4 names · tap your die to pick its colour ·{" "}
          <button
            onClick={openReadme}
            style={{
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              color: "#4CC9F0",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {VERSION}
          </button>
        </p>
        {savedGame && (
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: T.card,
              border: `1px solid ${COLOUR_CHOICES[3].hex}`,
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>Game in progress</div>
              <div style={{ fontSize: 13, color: T.sub55 }}>
                Round {savedGame.round} of 13 · {savedGame.players[savedGame.current].name}'s turn ·{" "}
                {savedGame.players.map((p) => p.name).join(", ")}
              </div>
            </div>
            <button
              onClick={resumeGame}
              style={{
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 800,
                padding: "9px 16px",
                borderRadius: 12,
                border: "none",
                background: T.btn,
                color: "#FFF",
                cursor: "pointer",
              }}
            >
              Resume
            </button>
            <button
              onClick={discardSaved}
              aria-label="Discard saved game"
              style={{
                fontFamily: "inherit",
                fontSize: 13,
                padding: "9px 10px",
                borderRadius: 12,
                border: `1px solid ${T.inputBorder}`,
                background: "transparent",
                color: T.sub55,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            background: T.card,
            border: T.cardBorder,
            boxShadow: T.cardShadow,
            borderRadius: 20,
            padding: "22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              ...(T.rosterBand
                ? { background: T.rosterBand, padding: 14, borderRadius: 14 }
                : null),
            }}
          >
          {nameInputs.map((val, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => cycleColour(i)}
                aria-label={`Change player ${i + 1} dice colour, currently ${COLOUR_CHOICES[colourPicks[i]].name}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: skinColour(COLOUR_CHOICES[colourPicks[i]].hex),
                  flexShrink: 0,
                  border: `2px solid ${T.border3}`,
                  boxShadow: `0 0 10px ${skinColour(COLOUR_CHOICES[colourPicks[i]].hex)}66`,
                  cursor: "pointer",
                  padding: 5,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", width: "100%", height: "100%" }}>
                  {[0, 2, 4, 6, 8].map((cell) => (
                    <div key={cell} style={{ gridColumn: (cell % 3) + 1, gridRow: Math.floor(cell / 3) + 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: pipColourFor(skinColour(COLOUR_CHOICES[colourPicks[i]].hex)) }} />
                    </div>
                  ))}
                </div>
              </button>
              <input
                value={val}
                onChange={(e) =>
                  setNameInputs((n) => n.map((v, j) => (j === i ? e.target.value : v)))
                }
                placeholder={i < 2 ? `Player ${i + 1}` : `Player ${i + 1} (optional)`}
                maxLength={14}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "inherit",
                  fontSize: 17,
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: `1px solid ${T.inputBorder}`,
                  background: T.inputBg,
                  color: T.text,
                }}
              />
            </div>
          ))}
          </div>
          <button
            onClick={() => setAddBot((b) => !b)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${addBot ? "#4CC9F0" : T.inputBorder}`,
              background: addBot ? "rgba(76,201,240,0.12)" : "transparent",
              color: T.text,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <BotIcon size={22} />
            <span style={{ flex: 1, textAlign: "left" }}>Add AI (computer player)</span>
            <span style={{ fontSize: 13, color: addBot ? "#4CC9F0" : T.sub45 }}>{addBot ? "IN" : "OUT"}</span>
          </button>
          {addBot && (
            <div style={{ display: "flex", gap: 8 }}>
              {["Easy", "Normal", "Ruthless"].map((label, lvl) => (
                <button
                  key={label}
                  onClick={() => setAiLevel(lvl)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 10,
                    border: `1px solid ${aiLevel === lvl ? "#4CC9F0" : T.inputBorder}`,
                    background: aiLevel === lvl ? "rgba(76,201,240,0.14)" : "transparent",
                    color: aiLevel === lvl ? "#4CC9F0" : T.sub55,
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            {bigButton("Let's Go", startGame, namedCount + (addBot ? 1 : 0) < 2)}
          </div>
          {namedCount + (addBot ? 1 : 0) < 2 && (
            <p style={{ textAlign: "center", fontSize: 13, color: T.sub45, margin: 0 }}>
              Enter a name or two, or draft in the AI
            </p>
          )}
        </div>

        {/* How to play */}
        <div style={{ width: "100%", maxWidth: 380, marginTop: 16 }}>
          <button
            onClick={() => setShowHowTo((s) => !s)}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 14,
              border: T.cardBorder,
            boxShadow: T.cardShadow,
              background: T.card,
              color: T.text,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>🎲 How to play</span>
            <span style={{ color: T.sub45 }}>{showHowTo ? "▲" : "▼"}</span>
          </button>
          {showHowTo && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 14,
                border: T.cardBorder,
            boxShadow: T.cardShadow,
                background: T.card,
                padding: "14px 16px",
                fontSize: 13.5,
                lineHeight: 1.55,
                color: T.sub70,
              }}
            >
              <p style={{ margin: "0 0 10px" }}>
                <strong style={{ color: T.text }}>Your turn.</strong> Roll five dice, up to three times. Between rolls, tap
                dice to hold them, held dice keep their value while the rest reroll. Shake the phone to roll if you fancy.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                <strong style={{ color: T.text }}>Bank a score.</strong> After rolling, every open category shows what this
                hand would pay. Tap one to bank it. Each category can only be used once, and once all thirteen are filled,
                the game ends. A hand worth nothing? You still have to bank somewhere, choose your sacrifice wisely.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                <strong style={{ color: T.text }}>The upper section</strong> pays for matching number dice: Ones through
                Sixes. Score 63 or more up there and a 35 point bonus lands automatically, the card counts you down to it.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                <strong style={{ color: T.text }}>The lower section</strong> pays for hands: three or four of a kind (face
                total), Full House 25, small straight 30, large straight 40, Chance is the face total any time. Five of a
                kind is a FAHTZEE, 50 points, and every one after your first is worth 100 more.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: T.text }}>Winning.</strong> Highest total after thirteen rounds takes it. Ties go to
                a sudden death roll off. Fat thumbed the wrong category? There is an undo button after every score. Interrupted
                mid game? It saves itself, come back any time.
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ width: "100%", maxWidth: 380, marginTop: 16 }}>
          <button
            onClick={() => setShowStats((s) => !s)}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 14,
              border: T.cardBorder,
            boxShadow: T.cardShadow,
              background: T.card,
              color: T.text,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>📊 Stats & history</span>
            <span style={{ color: T.sub45 }}>{tally.games} game{tally.games === 1 ? "" : "s"} {showStats ? "▲" : "▼"}</span>
          </button>
          {showStats && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 14,
                border: T.cardBorder,
            boxShadow: T.cardShadow,
                background: T.card,
                overflow: "hidden",
              }}
            >
              {tally.games === 0 && (
                <div style={{ padding: "16px", fontSize: 14, color: T.sub55, textAlign: "center" }}>
                  No games recorded yet on this device. Play one and the legend begins.
                </div>
              )}
              {tally.games > 0 && (() => {
                const rows = Object.entries(tally.players).sort((a, b) => b[1].wins - a[1].wins);
                const h2h = tally.h2h || {};
                const notes = [];
                // The two most dramatic runs. More than that and it stops being a headline.
                Object.entries(tally.players)
                  .filter(([, s]) => Math.abs(s.streak || 0) >= 2)
                  .sort((a, b) => Math.abs(b[1].streak) - Math.abs(a[1].streak))
                  .slice(0, 2)
                  .forEach(([name, s]) => notes.push(streakLine(name, s.streak)));
                // The busiest rivalry, once the pair have met often enough to earn the word
                const names = Object.keys(tally.players);
                let top = null;
                for (let i = 0; i < names.length; i++) {
                  for (let j = i + 1; j < names.length; j++) {
                    const a = names[i], b = names[j];
                    const aw = (h2h[a] && h2h[a][b]) || 0;
                    const bw = (h2h[b] && h2h[b][a]) || 0;
                    if (aw + bw >= RIVALRY_MIN && (!top || aw + bw > top.met)) {
                      top = { met: aw + bw, line: rivalryLine(a, aw, b, bw) };
                    }
                  }
                }
                if (top) notes.push(top.line);
                // The record, and who is responsible for it
                const holder = rows.reduce((m, [n, s]) => (s.best > (m ? m[1] : 0) ? [n, s.best] : m), null);
                if (holder) notes.push(bestLine(holder[0], holder[1]));
                return (
                  <>
                    {notes.length > 0 && (
                      <div style={{ padding: "11px 14px", background: T.rowBg, borderBottom: `1px solid ${T.border2}` }}>
                        {notes.map((line, i) => (
                          <div key={i} style={{ fontSize: 13, lineHeight: 1.55, color: T.sub70 }}>{line}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", padding: "8px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: T.sectionText, background: T.section }}>
                      <span style={{ flex: 1 }}>PLAYER</span>
                      <span style={{ width: 42, textAlign: "right" }}>WINS</span>
                      <span style={{ width: 48, textAlign: "right" }}>WIN %</span>
                      <span style={{ width: 42, textAlign: "right" }}>PLD</span>
                      <span style={{ width: 44, textAlign: "right" }}>BEST</span>
                    </div>
                    {rows.map(([name, s]) => (
                      <div key={name} style={{ display: "flex", padding: "9px 14px", fontSize: 13.5, borderTop: `1px solid ${T.border2}`, color: T.text }}>
                        <span style={{ flex: 1, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ width: 42, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{s.wins}</span>
                        <span style={{ width: 48, textAlign: "right", fontWeight: 800, color: T.green, fontVariantNumeric: "tabular-nums" }}>
                          {s.played > 0 ? Math.round((s.wins / s.played) * 100) + "%" : "—"}
                        </span>
                        <span style={{ width: 42, textAlign: "right", color: T.sub55, fontVariantNumeric: "tabular-nums" }}>{s.played}</span>
                        <span style={{ width: 44, textAlign: "right", color: T.sub55, fontVariantNumeric: "tabular-nums" }}>{s.best}</span>
                      </div>
                    ))}
                    <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: T.sectionText, background: T.section }}>
                      RECENT GAMES
                    </div>
                    {history.slice(0, 5).map((g, i) => (
                      <div key={i} style={{ padding: "9px 16px", fontSize: 13, borderTop: `1px solid ${T.border2}`, color: T.sub60 }}>
                        <span style={{ fontWeight: 700, color: T.text }}>{g.winners.join(" & ")}</span>
                        {" won · "}
                        {g.results.map((r) => `${r.name} ${r.total}`).join(" · ")}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </>
    );
  }

  // ---------- Handoff screen ----------
  if (phase === "handoff") {
    return shell(
      <>
        <p style={{ color: T.sub60, margin: "4px 0 44px", fontSize: 14 }}>
          Round {round} of 13
        </p>
        <div
          style={{
            animation: "pop 0.35s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: T.card,
            border: `2px solid ${skinColour(player.colour)}`,
            borderRadius: 24,
            padding: "30px 40px",
            marginBottom: 30,
            boxShadow: `0 0 30px ${skinColour(player.colour)}33`,
          }}
        >
          <div style={{ fontSize: 15, color: T.sub60, marginBottom: 6 }}>
            {player.isBot ? "Sit back, it is" : "Pass the phone to"}
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: skinColour(player.colour), marginBottom: 18, textShadow: colourGlowFor(skinColour(player.colour), 1.3) || "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {player.name} {player.isBot ? <BotIcon size={28} /> : null}
            </span>
          </div>
          {player.isBot ? (
            <div style={{ fontSize: 14, color: T.sub55 }}>warming up the servos…</div>
          ) : (
            bigButton("I'm Ready", () => setPhase("playing"))
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {players.map((p, i) => (
            <div
              key={i}
              style={{
                background: T.card,
                border: `1px solid ${i === current ? skinColour(p.colour) : T.border}`,
                borderRadius: 14,
                padding: "8px 14px",
                fontSize: 14,
                textAlign: "center",
                minWidth: 74,
              }}
            >
              <div style={{ color: skinColour(p.colour), fontWeight: 800, textShadow: colourGlowFor(skinColour(p.colour), 0.6) || "none" }}>{p.name}</div>
              <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{totalsFor(p).grand}</div>
            </div>
          ))}
        </div>
        {undoSnap && (
          <button
            onClick={undoLast}
            style={{
              marginTop: 18,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${T.border3}`,
              background: "transparent",
              color: T.sub55,
              cursor: "pointer",
            }}
          >
            ↩ Undo {undoSnap.players[undoSnap.current].name}'s last score
          </button>
        )}
      </>
    );
  }

  // ---------- Game over screen ----------
  if (phase === "over") {
    const ranked = players
      .map((p, i) => ({ ...p, idx: i, total: totalsFor(p).grand }))
      .sort((a, b) => b.total - a.total);
    const topScore = ranked[0].total;
    const tiedForFirst = ranked.filter((p) => p.total === topScore);
    const isTie = tiedForFirst.length > 1;

    // Competition ranking: tied players share the same position (1, 1, 3...)
    const positionOf = (p) => 1 + ranked.filter((q) => q.total > p.total).length;
    const positionLabel = (p) => {
      const pos = positionOf(p);
      const shared = ranked.filter((q) => positionOf(q) === pos).length > 1;
      return `${pos}${shared ? "=" : ""}`;
    };

    // Roll-off state (machinery lives at component scope now)
    const nextToRoll = rolloffNext;
    const rolloffDone = rolloff && nextToRoll === undefined;
    let rolloffWinnerIdx = null;
    let stillTied = [];
    if (rolloffDone) {
      const max = Math.max(...rolloff.contenders.map((c) => rolloff.results[c]));
      stillTied = rolloff.contenders.filter((c) => rolloff.results[c] === max);
      if (stillTied.length === 1) rolloffWinnerIdx = stillTied[0];
    }

    const headline = rolloffWinnerIdx !== null
      ? `${players[rolloffWinnerIdx].name} wins the roll-off`
      : isTie
      ? `Tie at the top on ${topScore}`
      : `${tiedForFirst[0].name} wins with ${topScore}`;

    return shell(
      <>
        {(!isTie || rolloffWinnerIdx !== null) && <Confetti />}
        <div style={{ fontSize: 50, margin: "18px 0 6px" }}>{isTie && rolloffWinnerIdx === null ? "⚔️" : "🏆"}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 20, textAlign: "center", animation: "pop 0.4s ease" }}>
          {headline}
        </div>

        {/* Roll-off panel */}
        {isTie && (
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: T.card,
              border: "1px solid rgba(255,210,63,0.4)",
              borderRadius: 20,
              padding: "18px 18px 20px",
              marginBottom: 22,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {!rolloff && (
              <>
                <div style={{ fontSize: 14, color: T.sub70, textAlign: "center" }}>
                  Scores level. Settle it in a roll-off: three rolls of five dice each, your highest roll counts.
                </div>
                {bigButton("Start Roll-Off", () => startRolloff(tiedForFirst.map((p) => p.idx)))}
              </>
            )}

            {rolloff && (
              <>
                {rolloffDice && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {rolloffDice.map((d, i) => (
                      <Die key={i} value={d} held={false} rolling={rolloffRolling} disabled colour={nextToRoll !== undefined ? skinColour(players[nextToRoll].colour) : players[rolloff.contenders[rolloff.contenders.length - 1]].colour} />
                    ))}
                  </div>
                )}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                  {rolloff.contenders.map((cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 12,
                        background: cIdx === nextToRoll ? "rgba(255,210,63,0.12)" : T.section,
                        border: `1px solid ${cIdx === rolloffWinnerIdx ? "#FFD23F" : T.border2}`,
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: skinColour(players[cIdx].colour) }} />
                      <span style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>{players[cIdx].name}</span>
                      <span style={{ fontSize: 11, color: T.sub45, fontWeight: 700, marginRight: 8 }}>
                        {(rolloff.rollsTaken[cIdx] || 0)}/3
                      </span>
                      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 16 }}>
                        {rolloff.results[cIdx] !== undefined ? rolloff.results[cIdx] : "—"}
                      </span>
                    </div>
                  ))}
                </div>
                {nextToRoll !== undefined && players[nextToRoll].isBot && (
                  <div style={{ fontSize: 14, color: T.sub55, fontWeight: 700 }}>
                    {rolloffRolling ? "The AI is rolling…" : "The AI takes its rolls…"}
                  </div>
                )}
                {nextToRoll !== undefined && !players[nextToRoll].isBot &&
                  bigButton(
                    rolloffRolling
                      ? "Rolling…"
                      : `${players[nextToRoll].name}, Roll ${(rolloff.rollsTaken[nextToRoll] || 0) + 1} of 3`,
                    () => rollForContender(nextToRoll),
                    rolloffRolling
                  )}
                {rolloffDone && stillTied.length > 1 && (
                  <>
                    <div style={{ fontSize: 14, color: T.sub70 }}>Still level. Go again.</div>
                    {bigButton("Roll Again", () => startRolloff(stillTied))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: 380,
            background: T.card,
            border: T.cardBorder,
            boxShadow: T.cardShadow,
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 30,
          }}
        >
          {ranked.map((p, i) => {
            const isChamp = rolloffWinnerIdx !== null ? p.idx === rolloffWinnerIdx : p.total === topScore && !isTie;
            return (
              <div
                key={p.name + i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 18px",
                  borderBottom: i < ranked.length - 1 ? `1px solid ${T.border2}` : "none",
                  background: isChamp
                    ? "rgba(255,210,63,0.14)"
                    : p.total === topScore
                    ? "rgba(255,210,63,0.06)"
                    : "transparent",
                }}
              >
                <span style={{ fontWeight: 800, color: T.sub50, width: 28 }}>{positionLabel(p)}</span>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: skinColour(p.colour) }} />
                <span style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>
                  {p.name} {isChamp ? "👑" : ""}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 18 }}>{p.total}</span>
              </div>
            );
          })}
        </div>
        {bigButton("Play Again", newGame)}
        {undoSnap && (
          <button
            onClick={undoLast}
            style={{
              marginTop: 18,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${T.border3}`,
              background: "transparent",
              color: T.sub55,
              cursor: "pointer",
            }}
          >
            ↩ Undo {undoSnap.players[undoSnap.current].name}'s last score
          </button>
        )}
      </>
    );
  }

  // ---------- Playing screen ----------
  const t = totalsFor(player);
  const scoredCount = Object.keys(player.scores).length;

  const Row = ({ cat }) => {
    const scored = player.scores[cat.key] !== undefined;
    const preview = hasRolled && !scored ? SCORERS[cat.key](dice) : null;

    if (scored) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "8px 10px",
            borderBottom: `1px solid ${T.card}`,
            fontSize: 13,
            color: T.sub35,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: T.green, fontSize: 13 }}>✓</span>
            <span style={{ textDecoration: "line-through", textDecorationColor: T.sub25 }}>
              {cat.label}
            </span>
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{player.scores[cat.key]}</span>
        </div>
      );
    }

    return (
      <button
        onClick={() => scoreCategory(cat.key)}
        disabled={!hasRolled || rolling || player.isBot}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "10px 10px",
          background: T.rowBg,
          border: "none",
          borderLeft: `3px solid ${hasRolled ? skinColour(player.colour) : T.borderIdle}`,
          borderBottom: `1px solid ${T.card}`,
          cursor: hasRolled ? "pointer" : "default",
          fontFamily: "inherit",
          fontSize: 13.5,
          color: T.text,
          fontWeight: 600,
          transition: "background 0.12s ease",
        }}
        onMouseEnter={(e) => {
          if (hasRolled && !player.isBot) e.currentTarget.style.background = "rgba(247,37,133,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = T.rowBg;
        }}
      >
        <span style={{ letterSpacing: cat.key === "fahtzee" ? "0.04em" : 0, fontWeight: cat.key === "fahtzee" ? 900 : 600 }}>
          {cat.label}
        </span>
        {preview !== null ? (
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 999,
              background: preview > 0 ? T.greenBg : T.chipBg,
              color: preview > 0 ? T.green : T.sub45,
            }}
          >
            +{preview}
          </span>
        ) : (
          <span style={{ color: T.sub30, fontSize: 12 }}>open</span>
        )}
      </button>
    );
  };

  // ---------- Tabletop skin: its own playing-screen layout ----------
  if (skin === "tabletop") {
    const CHT = "#3A2E28", CREAMT = "#FBF3E6", BROWNT = "#5D4037";
    // Five dice + gaps must fit inside the board on any phone
    const vw = typeof window !== "undefined" ? Math.min(window.innerWidth, 480) : 400;
    const boardDie = Math.max(46, Math.min(64, Math.floor((vw - 78) / 5.35)));
    const TileRow = ({ cat }) => {
      const scored = player.scores[cat.key] !== undefined;
      const preview = hasRolled && !scored ? SCORERS[cat.key](dice) : null;
      return (
        <button
          onClick={() => scoreCategory(cat.key)}
          disabled={scored || !hasRolled || rolling || player.isBot}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 10,
            border: scored ? "2.5px solid rgba(58,46,40,0.3)" : `2.5px solid ${CHT}`,
            background: scored ? "rgba(58,46,40,0.07)" : "#FFFFFF",
            cursor: scored || !hasRolled || player.isBot ? "default" : "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            color: scored ? "rgba(58,46,40,0.45)" : CHT,
          }}
        >
          <span style={{ textDecoration: scored ? "line-through" : "none", letterSpacing: cat.key === "fahtzee" ? "0.04em" : 0 }}>
            {scored ? "✓ " : ""}{cat.label}
          </span>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
              color: scored ? "rgba(58,46,40,0.5)" : preview !== null ? (preview > 0 ? "#3D8B37" : "rgba(58,46,40,0.35)") : "rgba(58,46,40,0.3)",
            }}
          >
            {scored ? player.scores[cat.key] : preview !== null ? `+${preview}` : "·"}
          </span>
        </button>
      );
    };
    const Tab = ({ colour, label }) => (
      <div
        style={{
          padding: "7px 10px",
          borderRadius: 10,
          border: `3px solid ${CHT}`,
          background: colour,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: CHT,
          textAlign: "center",
        }}
      >
        {label}
      </div>
    );
    return shell(
      <>
        {/* Scoreboard plaque */}
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: BROWNT,
            border: `3px solid ${CHT}`,
            borderRadius: 18,
            boxShadow: "0 6px 0 rgba(58,46,40,0.5)",
            display: "flex",
            justifyContent: "space-around",
            padding: "10px 8px 8px",
            marginTop: 6,
          }}
        >
          {players.map((p, i) => (
            <div key={i} style={{ textAlign: "center", opacity: i === current ? 1 : 0.7, minWidth: 64 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: skinColour(p.colour), letterSpacing: "0.06em", textShadow: colourGlowFor(skinColour(p.colour), 0.6) || "none" }}>
                {p.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: CREAMT, fontVariantNumeric: "tabular-nums" }}>
                {totalsFor(p).grand}
              </div>
              <div style={{ height: 3, background: i === current ? skinColour(p.colour) : "transparent", borderRadius: 2, marginTop: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", color: "rgba(58,46,40,0.6)", margin: "10px 0 12px" }}>
          ROUND {round} OF 13
        </div>

        {/* The board */}
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: CREAMT,
            border: `4px solid ${CHT}`,
            borderRadius: 24,
            boxShadow: "0 7px 0 rgba(58,46,40,0.4)",
            padding: "12px 10px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(58,46,40,0.55)", marginBottom: 10 }}>
            {player.isBot
              ? "THE AI IS PLAYING"
              : hasRolled
              ? `${player.name.toUpperCase()}'S ROLL · ${rollsLeft} LEFT · TAP DICE TO HOLD`
              : `${player.name.toUpperCase()}'S TURN · ${shakeStatus === "on" ? "SHAKE OR " : ""}TAP TO ROLL`}
          </div>
          <div style={{ display: "flex", gap: boardDie > 56 ? 8 : 6, marginBottom: 14, maxWidth: "100%" }}>
            {dice.map((d, i) => (
              <Die
                key={i}
                value={d}
                held={held[i]}
                rolling={rolling}
                disabled={!hasRolled || player.isBot}
                blank={!hasRolled && !rolling}
                colour={skinColour(player.colour)}
                size={boardDie}
                onClick={() => toggleHold(i)}
              />
            ))}
          </div>
          {bigButton(
            player.isBot
              ? "AI thinking…"
              : rollsLeft === 3
              ? "Roll"
              : rollsLeft > 0
              ? `Roll again · ${rollsLeft}`
              : "Pick a score",
            roll,
            rollsLeft === 0 || rolling || player.isBot
          )}
          {shakeStatus === "needsPermission" && (
            <button
              onClick={enableShake}
              style={{
                marginTop: 10,
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 999,
                border: `2px solid ${CHT}`,
                background: "transparent",
                color: CHT,
                cursor: "pointer",
              }}
            >
              📳 Enable shake to roll
            </button>
          )}
        </div>

        {/* Scorecard as tiles */}
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: CREAMT,
            border: `4px solid ${CHT}`,
            borderRadius: 24,
            boxShadow: "0 7px 0 rgba(58,46,40,0.4)",
            padding: "10px 10px 12px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
            <div>
              <Tab colour="#F0B93A" label={`UPPER · ${t.upperSum}/63${t.upperBonus ? " ✓" : ""}`} />
              {UPPER.map((cat) => (
                <TileRow key={cat.key} cat={cat} />
              ))}
              <div
                style={{
                  marginTop: 6,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "2.5px dashed rgba(58,46,40,0.35)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: t.upperBonus ? "#3D8B37" : "rgba(58,46,40,0.55)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>BONUS</span>
                <span>{t.upperBonus ? "+35" : `${63 - t.upperSum} to go`}</span>
              </div>
            </div>
            <div>
              <Tab colour="#7CC15C" label="LOWER" />
              {LOWER.map((cat) => (
                <TileRow key={cat.key} cat={cat} />
              ))}
              {player.yahtzeeBonuses > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "2.5px dashed rgba(58,46,40,0.35)",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#3D8B37",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>BONUS × {player.yahtzeeBonuses}</span>
                  <span>+{player.yahtzeeBonuses * 100}</span>
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: BROWNT,
              border: `3px solid ${CHT}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: CREAMT, letterSpacing: "0.08em" }}>TOTAL</span>
            <span style={{ fontSize: 21, fontWeight: 800, color: "#F0B93A", fontVariantNumeric: "tabular-nums" }}>
              {t.grand}
            </span>
          </div>
        </div>

        {undoSnap && (
          <button
            onClick={undoLast}
            style={{
              marginTop: 14,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 800,
              padding: "8px 18px",
              borderRadius: 999,
              border: `2.5px solid ${CHT}`,
              background: CREAMT,
              color: CHT,
              cursor: "pointer",
              boxShadow: "0 4px 0 rgba(58,46,40,0.4)",
            }}
          >
            ↩ Undo {undoSnap.players[undoSnap.current].name}'s last score
          </button>
        )}
      </>
    );
  }

  return shell(
    <>
      {/* Turn banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 2px" }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: skinColour(player.colour), boxShadow: `0 0 10px ${skinColour(player.colour)}88` }} />
        <span style={{ fontSize: 18, fontWeight: 800 }}>{player.name}</span>
        <span style={{ color: T.sub50, fontSize: 13 }}>· Round {round}/13 · {13 - scoredCount} to fill</span>
      </div>
      <p style={{ color: T.sub55, margin: "2px 0 14px", fontSize: 13 }}>
        {player.isBot
          ? "The AI is playing · watch and worry"
          : hasRolled
          ? "Tap dice to hold · tap a category to bank your score"
          : shakeStatus === "on"
          ? "Shake your phone or hit the button to roll"
          : "Hit the button to roll"}
      </p>

      {/* Dice tray */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "18px 14px",
          maxWidth: "100%",
          background: T.tray,
          borderRadius: 22,
          border: T.cardBorder,
          boxShadow: T.cardShadow,
          marginBottom: 14,
        }}
      >
        {dice.map((d, i) => (
          <Die
            key={i}
            value={d}
            held={held[i]}
            rolling={rolling}
            disabled={!hasRolled || player.isBot}
            blank={!hasRolled && !rolling}
            colour={skinColour(player.colour)}
            onClick={() => toggleHold(i)}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 18 }}>
        {bigButton(
          player.isBot
            ? "The AI is thinking…"
            : rollsLeft === 3
            ? "Roll 🎲"
            : rollsLeft > 0
            ? `Roll Again · ${rollsLeft} left`
            : "Pick a category",
          roll,
          rollsLeft === 0 || rolling || player.isBot
        )}
        {shakeStatus === "needsPermission" && (
          <button
            onClick={enableShake}
            style={{
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 16px",
              borderRadius: 999,
              border: `1px solid ${T.border3}`,
              background: "transparent",
              color: T.sub70,
              cursor: "pointer",
            }}
          >
            📳 Enable shake to roll
          </button>
        )}
      </div>

      {/* Scorecard: upper and lower side by side */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: T.card2,
          border: T.cardBorder,
            boxShadow: T.cardShadow,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${T.border2}` }}>
            <div
              style={{
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: T.sectionText,
                background: T.section,
                whiteSpace: "nowrap",
              }}
            >
              UPPER · {t.upperSum}/63 {t.upperBonus ? "✓" : ""}
            </div>
            {UPPER.map((cat) => (
              <Row key={cat.key} cat={cat} />
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 10px",
                fontSize: 12,
                color: t.upperBonus ? T.green : T.sub45,
                fontWeight: 700,
              }}
            >
              <span>Bonus</span>
              <span>{t.upperBonus ? "+35" : `${63 - t.upperSum} to go`}</span>
            </div>
          </div>
          <div>
            <div
              style={{
                padding: "9px 10px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: T.sectionText,
                background: T.section,
              }}
            >
              LOWER
            </div>
            {LOWER.map((cat) => (
              <Row key={cat.key} cat={cat} />
            ))}
            {player.yahtzeeBonuses > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", fontSize: 12, color: T.green, fontWeight: 700 }}>
                <span>Bonus × {player.yahtzeeBonuses}</span>
                <span style={{ fontWeight: 800 }}>+{player.yahtzeeBonuses * 100}</span>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 16px",
            fontWeight: 900,
            fontSize: 17,
            background: T.tray,
          }}
        >
          <span>TOTAL</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: skinColour(player.colour) }}>{t.grand}</span>
        </div>
      </div>

      {/* Standings strip */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {players.map((p, i) => (
          <div
            key={i}
            style={{
              background: T.card2,
              border: `1px solid ${i === current ? skinColour(p.colour) : T.border}`,
              borderRadius: 14,
              padding: "6px 12px",
              fontSize: 13,
              textAlign: "center",
              minWidth: 68,
            }}
          >
            <div style={{ color: skinColour(p.colour), fontWeight: 800, textShadow: colourGlowFor(skinColour(p.colour), 0.6) || "none" }}>{p.name}</div>
            <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{totalsFor(p).grand}</div>
          </div>
        ))}
      </div>
      {undoSnap && (
        <button
          onClick={undoLast}
          style={{
            marginTop: 14,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: 999,
            border: `1px solid ${T.border3}`,
            background: "transparent",
            color: T.sub55,
            cursor: "pointer",
          }}
        >
          ↩ Undo {undoSnap.players[undoSnap.current].name}'s last score
        </button>
      )}
    </>
  );
}
