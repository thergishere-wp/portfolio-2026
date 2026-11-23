"use client";

import { useEffect, useRef } from "react";
import { bangkokHour, lightAt } from "@/lib/room-light";
import styles from "./Room.module.css";

const SPECKS = 26;
/** Frame cap: slow drifting dust does not need 60 fps. */
const FRAME_MS = 1000 / 30;

interface Speck {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  rate: number;
  alpha: number;
}

/** One soft white dot, drawn once and stamped for every speck. */
function makeSprite(): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,250,240,0.55)");
    g.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return sprite;
}

/**
 * Dust specks drifting in the window light. A lightweight canvas: 26 sprites,
 * capped at 30 fps, stopped while the tab is hidden and while it is night (no
 * sun, nothing to catch the light). Mounted only when motion is allowed.
 */
export function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprite = makeSprite();
    let width = 0;
    let height = 0;
    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const specks: Speck[] = Array.from({ length: SPECKS }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.4 + Math.random() * 2.6,
      vx: (Math.random() - 0.35) * 5,
      vy: -1.5 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      rate: 0.4 + Math.random() * 0.9,
      alpha: 0.25 + Math.random() * 0.5,
    }));

    let raf = 0;
    let last = 0;
    let running = false;

    const frame = (time: number): void => {
      raf = requestAnimationFrame(frame);
      if (time - last < FRAME_MS) return;
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;

      ctx.clearRect(0, 0, width, height);
      for (const s of specks) {
        // Wander a little on a slow sine, drift, and wrap around the beam.
        s.x += (s.vx + Math.sin(time / 2200 + s.phase) * 2.2) * dt;
        s.y += (s.vy + Math.cos(time / 2600 + s.phase) * 1.6) * dt;
        if (s.x < -8) s.x = width + 8;
        if (s.x > width + 8) s.x = -8;
        if (s.y < -8) s.y = height + 8;
        if (s.y > height + 8) s.y = -8;
        // Twinkle as each speck turns through the light.
        ctx.globalAlpha =
          s.alpha * (0.45 + 0.55 * Math.sin((time / 1000) * s.rate + s.phase));
        ctx.drawImage(sprite, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
    };

    const start = (): void => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = (): void => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = (): void => {
      const sunny = lightAt(bangkokHour()).fx > 0.04;
      if (document.hidden || !sunny) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else {
        start();
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    // The sun comes and goes with the time of day.
    const clock = window.setInterval(sync, 60_000);
    window.addEventListener("resize", resize);
    return () => {
      stop();
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={styles.dust} aria-hidden="true" />;
}
