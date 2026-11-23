"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { attachSnap } from "@/lib/snap-points";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";

const LenisContext = createContext<Lenis | null>(null);

/** The shared Lenis instance, or null before mount and under reduced motion. */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/** Release the scroll lock once the intro has finished. */
export function unlockScroll(lenis: Lenis | null): void {
  document.documentElement.classList.remove("locked");
  lenis?.start();
}

/**
 * Lenis driven from gsap.ticker and forwarded to ScrollTrigger. Scrolling is
 * locked until the intro calls unlockScroll(). Under prefers-reduced-motion
 * there is no smooth scroll and no lock: the page scrolls natively.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const html = document.documentElement;
    if (reduced) {
      html.classList.remove("locked");
      return;
    }

    html.classList.add("locked");
    const instance = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number): void => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis Snap settles on the step labels. "lock": one gesture moves to the
    // next label in its direction, so a small scroll always makes something
    // happen. It pauses and resumes together with Lenis (intro, open windows).
    const snap = new Snap(instance, {
      type: "lock",
      // The default (50% of the viewport) would ignore the long camera
      // segments: a locked gesture always goes to the next label.
      distanceThreshold: Number.MAX_SAFE_INTEGER,
      duration: 0.9,
      easing: (t: number): number => 1 - Math.pow(1 - t, 3),
      debounce: 60,
    });
    attachSnap(snap);
    const stop = instance.stop.bind(instance);
    const start = instance.start.bind(instance);
    instance.stop = (): void => {
      stop();
      snap.stop();
    };
    instance.start = (): void => {
      start();
      snap.start();
    };
    instance.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Lenis is an external system created on mount
    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      attachSnap(null);
      snap.destroy();
      instance.destroy();
      setLenis(null);
      html.classList.remove("locked");
    };
  }, [reduced]);

  return <LenisContext value={lenis}>{children}</LenisContext>;
}
