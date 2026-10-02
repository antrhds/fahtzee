import React, { useEffect, useRef, useState } from "react";
import { createMilestone, SLAM } from "./milestone.js";
import { play, say, haptic, hushMilestone } from "./audio.js";
import { pick, nameList, MILESTONE_CAPTION, MILESTONE_CAPTION_AI, MILESTONE_SAY, MILESTONE_SAY_AI } from "./lines.js";

// The 50th, 100th, 250th and 500th game (and every 500 after): a full screen celebration over
// whatever is underneath. The game asks for it with a window event, so it
// can sit beside the splash in entry.jsx and appear on any screen:
//   window.dispatchEvent(new CustomEvent("fahtzee-milestone", { detail: { n, players } }))
// players: [{ name, colour, isBot, played, wins, best }] — everyone who just got there.
export const MILESTONE_EVENT = "fahtzee-milestone";
const FADE_MS = 500;
const TAP_FROM = SLAM + 0.6; // taps before this are the game's, not a skip
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const DISPLAY = "'Baloo 2', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";

const reducedMotion = () => {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { return false; }
};

export default function Milestone() {
  const [show, setShow] = useState(null); // { n, players, caption }
  const [fading, setFading] = useState(false);
  const [size, setSize] = useState({ w: 360, h: 740, s: 1 / 3 });
  const canvasRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => {
    const on = (e) => {
      const d = e.detail || {};
      if (!d.n || !d.players || !d.players.length) return;
      const people = d.players.filter((p) => !p.isBot);
      const names = nameList((people.length ? people : d.players).map((p) => p.name));
      const caption = people.length ? pick(MILESTONE_CAPTION)(names, d.n) : pick(MILESTONE_CAPTION_AI)(d.n);
      const line = people.length ? pick(MILESTONE_SAY)(names, d.n) : pick(MILESTONE_SAY_AI)(d.n);
      setFading(false);
      setShow({ n: d.n, players: d.players, caption, line, ai: !people.length });
    };
    window.addEventListener(MILESTONE_EVENT, on);
    return () => window.removeEventListener(MILESTONE_EVENT, on);
  }, []);

  const leave = () => {
    if (fading) return;
    if ((performance.now() - startRef.current) / 1000 < TAP_FROM) return;
    hushMilestone();
    setFading(true);
    setTimeout(() => { setShow(null); setFading(false); }, FADE_MS);
  };

  useEffect(() => {
    if (!show) return;
    startRef.current = performance.now();
    // The number is drawn in Baloo 2; ask for it now so the count-up uses it
    try { document.fonts && document.fonts.load("800 100px 'Baloo 2'"); } catch (e) {}
    play("milestone");
    const timers = [
      setTimeout(() => haptic([60, 40, 200, 60, 40, 60, 40, 300]), SLAM * 1000),
      setTimeout(() => say(show.line, show.ai ? { pitch: 0.8, rate: 0.9 } : {}), (SLAM + 0.5) * 1000),
    ];
    const canvas = canvasRef.current;
    const m = canvas && createMilestone(canvas);
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight;
      if (m) m.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
      setSize({ w, h, s: m ? m.scale() : Math.min(w / 1080, h / 1500) });
    };
    fit();
    window.addEventListener("resize", fit);
    const colours = show.players.map((p) => p.colour).filter(Boolean);
    let raf = 0;
    if (m) {
      if (reducedMotion()) m.draw(SLAM + 1.6, show.n, colours);
      else {
        const frame = (now) => {
          m.draw((now - startRef.current) / 1000, show.n, colours);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key !== "Tab") leave(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!show) return null;
  const still = reducedMotion();
  // CSS entrances, timed against the canvas (both start when this mounts)
  const enter = (at, extra = "") =>
    still ? {} : { animation: `fahtzeeMsIn 0.7s cubic-bezier(.2,1.4,.4,1) ${at}s both${extra}` };
  const solo = show.players.length === 1 ? show.players[0] : null;
  const pct = solo && solo.played ? Math.round((100 * solo.wins) / solo.played) : null;
  // The text sits just under the big number (see NUMBER_Y in milestone.js)
  const top = size.h / 2 - 70 * size.s;

  return (
    <div
      role="button"
      aria-label={`${show.n} games. Tap to carry on.`}
      data-milestone={fading ? "fading" : "on"}
      onClick={leave}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "#0B0818",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        animation: still ? "none" : "fahtzeeMsFade 0.5s ease both",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        overflow: "hidden",
        color: "#F5F3FA",
        fontFamily: FONT,
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", left: 16, right: 16, top, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 9, textTransform: "uppercase", color: "#FFD98A",
          paddingLeft: 9, ...enter(SLAM + 0.15) }}>
          games
        </div>
        <div style={{ marginTop: 14, fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, lineHeight: 1.1,
          overflowWrap: "anywhere", ...enter(SLAM + 0.45) }}>
          {show.players.map((p, i) => (
            <span key={p.name}>
              {i > 0 && <span style={{ color: "rgba(245,243,250,0.6)", fontSize: 26 }}>{i === show.players.length - 1 ? " and " : ", "}</span>}
              <span style={{ color: p.colour || "#F5F3FA", textShadow: `0 0 18px ${p.colour || "#FFC94A"}, 0 2px 0 rgba(0,0,0,0.5)` }}>
                {p.name}
              </span>
            </span>
          ))}
        </div>
        <div style={{ margin: "14px auto 0", maxWidth: 330, fontSize: 16, lineHeight: 1.45, color: "rgba(245,243,250,0.85)",
          ...enter(SLAM + 0.9) }}>
          {show.caption}
        </div>
        {solo && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            {[
              [solo.wins, "won"],
              [`${pct}%`, "win rate"],
              [solo.best, "best ever"],
            ].map(([v, label], i) => (
              <div key={label} style={{ minWidth: 86, padding: "8px 10px", borderRadius: 14,
                background: "rgba(255,201,74,0.12)", border: "1px solid rgba(255,201,74,0.45)",
                ...enter(SLAM + 1.3 + i * 0.15) }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD98A", fontVariantNumeric: "tabular-nums" }}>{v}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.7 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "max(26px, env(safe-area-inset-bottom))", textAlign: "center",
        fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(245,243,250,0.6)",
        pointerEvents: "none",
        ...(still ? {} : { animation: `fahtzeeMsFade 0.6s ease ${SLAM + 2.4}s both, fahtzeeMsBreathe 2s ease-in-out ${SLAM + 3}s infinite` }) }}>
        Tap to carry on
      </div>
      <style>
        {"@keyframes fahtzeeMsFade { from { opacity: 0 } to { opacity: 1 } }" +
          "@keyframes fahtzeeMsIn { from { opacity: 0; transform: translateY(18px) scale(0.6) } to { opacity: 1; transform: none } }" +
          "@keyframes fahtzeeMsBreathe { 0%, 100% { opacity: 0.6 } 50% { opacity: 0.25 } }"}
      </style>
    </div>
  );
}
