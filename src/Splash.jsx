import React, { useEffect, useRef, useState } from "react";
import { createSplash, SPLASH_LENGTH } from "./splash.js";

// The opening splash. Plays once per browser session, over the lobby (which
// is already loaded underneath), and any tap or key skips it. Silent: phones
// will not play sound before the first tap, and the first tap skips.
const SEEN_KEY = "fahtzee-splash-seen";
const HOLD = 0.5; // seconds to hold the final frame before fading
const FADE_MS = 400;

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
  const [state, setState] = useState(() => (shouldPlay() ? "playing" : "gone"));
  const canvasRef = useRef(null);
  const leaving = useRef(false);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    setState("fading");
    setTimeout(() => setState("gone"), FADE_MS);
  };

  useEffect(() => {
    if (state !== "playing") return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch (e) {}
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
    const onKey = () => leave();
    window.addEventListener("keydown", onKey);
    let raf = 0;
    let start = null;
    const frame = (now) => {
      if (start === null) start = now;
      const t = (now - start) / 1000;
      splash.draw(Math.min(t, SPLASH_LENGTH));
      if (t >= SPLASH_LENGTH + HOLD) leave();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [state === "playing"]);

  if (state === "gone") return null;
  return (
    <div
      role="presentation"
      aria-label="Fahtzee intro. Tap to skip."
      data-splash=""
      onPointerDown={leave}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#17132B",
        opacity: state === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        // stays solid while fading, so the skipping tap cannot land on the lobby
        pointerEvents: "auto",
        touchAction: "none",
        cursor: "pointer",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div
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
          animation: "fahtzeeSplashHint 0.6s ease 0.8s both",
          pointerEvents: "none",
        }}
      >
        Tap to skip
      </div>
      <style>{"@keyframes fahtzeeSplashHint { from { opacity: 0 } to { opacity: 1 } }"}</style>
    </div>
  );
}
