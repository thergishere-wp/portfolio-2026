"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
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
    // No snapping, ever: the user always controls the position. The wheel
    // moves the page by exactly what it reports, smoothed by a light lerp, so
    // motion settles within a few hundred ms of the last input.
    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    instance.on("scroll", ScrollTrigger.update);
    // A lerp only ever approaches its target, so the last pixels would crawl
    // for another second. Once within SETTLE_PX (about 440 ms after a 100 px
    // tick) the page lands on the target: no drift after the input stops.
    const SETTLE_PX = 8;
    const tick = (time: number): void => {
      instance.raf(time * 1000);
      const left = instance.targetScroll - instance.animatedScroll;
      if (!instance.isStopped && left !== 0 && Math.abs(left) < SETTLE_PX) {
        // scrollTo ignores a target equal to its own targetScroll, so point
        // that at where we are first; the jump then lands and ends the glide.
        const target = instance.targetScroll;
        instance.targetScroll = instance.animatedScroll;
        instance.scrollTo(target, { immediate: true, force: true });
      }
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    instance.stop();
    // `?debug` exposes the instance (and the wheel deltas it sees) to tests.
    if (new URLSearchParams(window.location.search).has("debug")) {
      Reflect.set(window, "__lenis", instance);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Lenis is an external system created on mount
    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
      html.classList.remove("locked");
    };
  }, [reduced]);

  return <LenisContext value={lenis}>{children}</LenisContext>;
}
