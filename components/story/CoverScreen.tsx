"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { projectsAct } from "@/content/projects";
import { gsap } from "@/lib/gsap";
import type { FoldRig } from "@/lib/fold-rig";
import { useBangkokTime } from "@/lib/time";
import type { ScreenMetrics } from "../stage3/phone-geometry";
import styles from "./cover.module.css";

/** Show a layer at `value` (0 to 1): fade it, hide it when off, only let it take clicks when on. */
function setLayer(el: HTMLElement, value: number): void {
  const opacity = String(Math.round(value * 1000) / 1000);
  if (el.dataset.opacity === opacity) return;
  el.dataset.opacity = opacity;
  el.style.opacity = opacity;
  el.style.visibility = value <= 0.001 ? "hidden" : "visible";
  el.style.pointerEvents = value > 0.5 ? "auto" : "none";
}

/**
 * The DOM on the cover screen (the outer face of the right half). It renders
 * inside drei's <Html>, so it is real, crisp, clickable DOM. In Projects it is
 * the lock screen; the rig cross-fades its layers.
 */
export function CoverScreen({
  rig,
  metrics,
}: {
  rig: FoldRig;
  /** The cover mesh as measured: the DOM is sized and clipped to it. */
  metrics: ScreenMetrics;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const clock = useBangkokTime("short");
  const day = useBangkokTime("menubar");

  useEffect(() => {
    const apply = (): void => {
      // The DOM sits behind the canvas, so it must hide itself while the
      // device is hidden (the model is not drawn, so nothing would cover it).
      if (rootRef.current) setLayer(rootRef.current, rig.show > 0.02 ? 1 : 0);
      if (lockRef.current) setLayer(lockRef.current, rig.lock);
    };
    apply();
    gsap.ticker.add(apply);
    return () => gsap.ticker.remove(apply);
  }, [rig]);

  // Runtime layout values, all from the measured mesh.
  const size = {
    width: metrics.px.w,
    height: metrics.px.h,
    "--sw": `${metrics.px.w}px`,
    "--sh": `${metrics.px.h}px`,
    "--sr": `${metrics.px.r}px`,
  } as CSSProperties;

  const date = day ? day.split(" ").slice(0, 3).join(" ") : "";

  return (
    <div ref={rootRef} className={styles.scr} style={size}>
      <div ref={lockRef} className={`${styles.layer} ${styles.lockScreen}`}>
        <svg
          className={styles.lockIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          <rect x="5" y="11" width="14" height="10" rx="2.5" />
        </svg>
        <p className={styles.date}>{date}</p>
        <p className={styles.time}>{clock ?? "--:--"}</p>
        <p className={styles.city}>Bangkok</p>
        <div className={styles.hint}>
          <svg
            className={styles.chev}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {projectsAct.lockedLabel}
        </div>
      </div>
    </div>
  );
}
