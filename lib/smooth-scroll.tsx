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
    const instance = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number): void => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    instance.stop();
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
