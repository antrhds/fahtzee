import React, { useEffect, useRef, useState } from "react";
import { createSplash, SPLASH_LENGTH, TAP_AT } from "./splash.js";
import { SPLASH_AUDIO } from "./splash-audio.js";
import { playClip } from "./audio.js";

// The opening splash, once per browser session, over the lobby (which is
// already loaded underneath). It opens on a still card that waits for a tap:
// a phone will only make sound after a tap, so that tap starts the animation
// and its soundtrack together. A second tap, or any key, skips the rest.
const SEEN_KEY = "fahtzee-splash-seen";
const HOLD = 0.5; // seconds to hold the final frame before fading
const FADE_MS = 400;
const AUDIO_GRACE_MS = 450; // start anyway if the soundtrack is slow to decode

const shouldPlay = () => {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
  } catch (e) {
    // storage unavailable: play it, the game still runs either way
  }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch (e) {}
  return true;
};

export default function Splash() {
  // waiting (the still card) -> playing -> fading -> gone
  const [state, setState] = useState(() => (shouldPlay() ? "waiting" : "gone"));
  const canvasRef = useRef(null);
  const run = useRef({ mode: "waiting", idleStart: null, playStart: 0, bgShift: 0, stopAudio: null });

  const leave = () => {
    const r = run.current;
    if (r.mode === "leaving") return;
    r.mode = "leaving";
    if (r.stopAudio) r.stopAudio();
    setState("fading");
    setTimeout(() => setState("gone"), FADE_MS);
  };

  const begin = () => {
    const r = run.current;
    if (r.mode !== "starting") return;
    const now = performance.now();
    r.bgShift = (now - (r.idleStart ?? now)) / 1000 - TAP_AT;
    r.playStart = now;
    r.mode = "playing";
    setState("playing");
  };

  const tap = () => {
    const r = run.current;
    if (r.mode === "waiting") {
      r.mode = "starting";
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch (e) {}
      // Must be called inside the tap, or the phone stays silent
      playClip(SPLASH_AUDIO).then((stop) => {
        if (!stop) return begin();
        if (r.mode === "starting") {
          r.stopAudio = stop;
          begin();
        } else stop(); // too late to be in sync, or already skipped: stay silent
      });
      setTimeout(begin, AUDIO_GRACE_MS);
    } else if (r.mode === "playing") leave();
  };

  useEffect(() => {
    if (state === "gone") return;
    const canvas = canvasRef.current;
    const splash = canvas && createSplash(canvas);
    if (!splash) {
      // no canvas support (or a test DOM): straight to the game
      setState("gone");
      return;
    }
    const fit = () => splash.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
    fit();
    window.addEventListener("resize", fit);
    const onKey = (e) => {
      if (e.key === "Tab") return;
      tap();
    };
    window.addEventListener("keydown", onKey);
    let raf = 0;
    const frame = (now) => {
      const r = run.current;
      if (r.idleStart === null) r.idleStart = now;
      if (r.mode === "waiting" || r.mode === "starting") splash.drawIdle((now - r.idleStart) / 1000);
      else if (r.mode === "playing") {
        const t = TAP_AT + (now - r.playStart) / 1000;
        splash.draw(Math.min(t, SPLASH_LENGTH), r.bgShift);
        if (t >= SPLASH_LENGTH + HOLD) leave();
      }
      if (r.mode !== "leaving") raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
    // the canvas and loop live for the whole splash, whatever its state
  }, [state === "gone"]);

  if (state === "gone") return null;
  const waiting = state === "waiting";
  return (
    <div
      role="button"
      aria-label={waiting ? "Fahtzee. Tap to play." : "Fahtzee intro. Tap to skip."}
      data-splash={state}
      onPointerDown={tap}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#17132B",
        opacity: state === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        // stays solid while fading, so a skipping tap cannot land on the lobby
        pointerEvents: "auto",
        touchAction: "none",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {waiting ? (
        <div
          key="play"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // just under the die: its half-height on the 1080x1920 stage is 180
            top: "calc(50% + min(16.67vw, 9.375vh) + 34px)",
            textAlign: "center",
            color: "rgba(245,243,250,0.9)",
            font: "600 15px system-ui, -apple-system, 'Segoe UI', sans-serif",
            letterSpacing: 5,
            textTransform: "uppercase",
            animation: "fahtzeeSplashIn 0.6s ease 0.3s both, fahtzeeSplashBreathe 2s ease-in-out 0.9s infinite",
            pointerEvents: "none",
          }}
        >
          Tap to play
        </div>
      ) : (
        <div
          key="skip"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "max(22px, env(safe-area-inset-bottom))",
            textAlign: "center",
            color: "rgba(245,243,250,0.45)",
            font: "500 13px system-ui, -apple-system, 'Segoe UI', sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
            animation: "fahtzeeSplashIn 0.6s ease 0.8s both",
            pointerEvents: "none",
          }}
        >
          Tap to skip
        </div>
      )}
      <style>
        {"@keyframes fahtzeeSplashIn { from { opacity: 0 } to { opacity: 1 } }" +
          "@keyframes fahtzeeSplashBreathe { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }"}
      </style>
    </div>
  );
}
