import React, { useEffect, useRef, useState } from "react";
import { createScene, SCENE_LENGTH, WORD_AT } from "./fahtzee-scene.js";
import { play, haptic, sayFahtzee, hushMilestone } from "./audio.js";

// The Fahtzee cut-scene overlay. The game asks for it with a window event the
// moment a roll lands five alike, and is told when it is over, so the AI can
// wait for it rather than play on underneath:
//   window.dispatchEvent(new CustomEvent(SCENE_EVENT, { detail: { face, colour, title, sub } }))
//   ...later: window "fahtzee-scene-done"
// It leaves by itself after SCENE_LENGTH; a tap after the first moment skips it.
export const SCENE_EVENT = "fahtzee-scene";
export const SCENE_DONE = "fahtzee-scene-done";
const SKIP_FROM = 0.8; // a tap before this was meant for the Roll button
const FADE_MS = 250;

export const prefersLessMotion = () => {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { return false; }
};

export default function FahtzeeScene() {
  const [show, setShow] = useState(null);
  const [fading, setFading] = useState(false);
  const canvasRef = useRef(null);
  const startRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const on = (e) => {
      doneRef.current = false;
      setFading(false);
      setShow({ ...(e.detail || {}), key: Date.now() });
    };
    window.addEventListener(SCENE_EVENT, on);
    return () => window.removeEventListener(SCENE_EVENT, on);
  }, []);

  const leave = (early) => {
    if (doneRef.current) return;
    if (early && (performance.now() - startRef.current) / 1000 < SKIP_FROM) return;
    doneRef.current = true;
    if (early) hushMilestone();
    setFading(true);
    setTimeout(() => {
      setShow(null);
      setFading(false);
      try { window.dispatchEvent(new CustomEvent(SCENE_DONE)); } catch (e) {}
    }, FADE_MS);
  };

  useEffect(() => {
    if (!show) return;
    startRef.current = performance.now();
    play("fahtzeeScene");
    const timers = [
      setTimeout(() => haptic([30, 40, 30, 40, 30, 40, 30, 60, 160]), WORD_AT * 1000),
      setTimeout(sayFahtzee, (WORD_AT + 0.1) * 1000),
      setTimeout(() => leave(false), SCENE_LENGTH * 1000),
    ];
    const canvas = canvasRef.current;
    const sc = canvas && createScene(canvas);
    const fit = () => sc && sc.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
    fit();
    window.addEventListener("resize", fit);
    const onKey = (e) => { if (e.key !== "Tab") leave(true); };
    window.addEventListener("keydown", onKey);
    let raf = 0;
    if (sc) {
      const frame = (now) => {
        sc.draw(Math.min(SCENE_LENGTH, (now - startRef.current) / 1000), show);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [show && show.key]);

  if (!show) return null;
  return (
    <div
      role="button"
      aria-label={`Fahtzee! ${show.sub || ""} Tap to skip.`}
      data-fahtzee-scene={fading ? "fading" : "on"}
      onClick={() => leave(true)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8500, // under the milestone (9000) and the splash
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        // the game behind goes soft as well as dark, like a camera pulling focus
        backdropFilter: fading ? "none" : "blur(3px)",
        WebkitBackdropFilter: fading ? "none" : "blur(3px)",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
