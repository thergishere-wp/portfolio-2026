"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  computeStageLayout,
  stageCssVars,
  type StageLayout,
} from "@/lib/stage-layout";

interface StageLayoutHandle {
  /** Latest layout as React state, for rendering (the outline paths). */
  layout: StageLayout | null;
  /** Latest layout as a ref, for GSAP function-based values. */
  layoutRef: RefObject<StageLayout>;
}

/**
 * Computes the iMac layout, writes it to CSS custom properties on <html>, and
 * recomputes on every ScrollTrigger refresh (which runs on resize). It listens
 * to `refreshInit` so the new sizes are in place before ScrollTrigger measures.
 */
export function useStageLayout(
  imacRef: RefObject<HTMLElement | null>,
): StageLayoutHandle {
  const layoutRef = useRef<StageLayout>(computeStageLayout(1440, 900));
  const [layout, setLayout] = useState<StageLayout | null>(null);

  useLayoutEffect(() => {
    const apply = (): void => {
      // A hidden or not-yet-sized window reports 0x0, which would make the
      // aspect clamp NaN. The next resize or refresh recomputes.
      if (!window.innerWidth || !window.innerHeight) return;
      const next = computeStageLayout(window.innerWidth, window.innerHeight);
      layoutRef.current = next;
      const root = document.documentElement;
      for (const [name, value] of Object.entries(stageCssVars(next))) {
        root.style.setProperty(name, value);
      }
      // GSAP caches the origin, so it has to be set through GSAP.
      if (imacRef.current) {
        gsap.set(imacRef.current, {
          transformOrigin: `${next.bezel + next.ws / 2}px ${next.bezel + next.hs / 2}px`,
        });
      }
      setLayout(next);
    };

    // Debounced: a resize drives a ScrollTrigger refresh, whose refreshInit
    // recomputes the layout above before anything is measured.
    let timer: number | undefined;
    const onResize = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };

    apply();
    ScrollTrigger.addEventListener("refreshInit", apply);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      ScrollTrigger.removeEventListener("refreshInit", apply);
    };
  }, [imacRef]);

  return { layout, layoutRef };
}
