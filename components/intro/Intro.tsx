"use client";

import { useEffect, useRef } from "react";
import { RgMark } from "@/components/chrome/RgMark";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { setIntroState } from "@/lib/intro-state";
import { unlockScroll, useLenis } from "@/lib/smooth-scroll";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import styles from "./Intro.module.css";

const query = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector);

const SEEN_KEY = "rg-intro-seen";

/** Time (s) at which the loader RG is gone and the outline starts to draw. */
const OUTLINE_AT = 2.1;
/** Total length (s) of the full intro. */
const TOTAL = 4.4;
/** Length (s) of the short version shown to returning visitors. */
const RETURNING = 1.2;

function hasSeenIntro(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage can be blocked. The full intro simply plays again next time.
  }
}

/**
 * Time-based intro, no element ever travels across the screen:
 *   0.0  "RG" + dot centred on the page, the dot blinks three times
 *   1.6  "RG" dissolves in place (blur + fade, 0.5 s)
 *   2.1  the iMac outline draws itself, already in its final position (1.2 s)
 *   3.2  body and stand fill in, the screen powers on with a soft white glow
 *   3.8  "RG" + dot fade in inside the screen, at its exact centre
 *   4.4  scroll hint appears and scrolling unlocks
 * Returning visitors in the same session get a 1.2 s version (the loader RG is
 * skipped). Any key press or click jumps to the end state. Skipped entirely
 * under reduced motion.
 */
export function Intro() {
  const reduced = usePrefersReducedMotion();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const loaderRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);

  // Read at completion time, since Lenis is created after this component mounts.
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useGSAP(
    (_context, contextSafe) => {
      if (reduced) return;
      const loader = loaderRef.current;
      const loaderMark = markRef.current;
      if (!loader || !loaderMark) return;

      setIntroState({ hint: false, unlocked: false });
      let cancelled = false;
      let done = false;
      let timeline: gsap.core.Timeline | null = null;

      const detach = (): void => {
        window.removeEventListener("keydown", skip);
        window.removeEventListener("click", skip);
      };

      const finish = (): void => {
        if (done) return;
        done = true;
        markIntroSeen();
        detach();
        setIntroState({ hint: true, unlocked: true });
        unlockScroll(lenisRef.current);
      };

      // Any key press or click jumps straight to the end state.
      function skip(): void {
        timeline?.progress(1, false);
        finish();
      }

      const run = (): void => {
        const screenMark = query<HTMLElement>("[data-screen-mark]");
        const outlineSvg = query<SVGElement>('[data-intro="outline"]');
        // Not gsap.utils.toArray(): inside useGSAP it is scoped to the loader,
        // and the iMac lives outside it.
        const outlinePaths = Array.from(
          document.querySelectorAll<SVGPathElement>(
            '[data-intro="outline"] path',
          ),
        );
        const bodyAndStand = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-intro="body"], [data-intro="stand"]',
          ),
        );
        const shadow = query<HTMLElement>('[data-intro="shadow"]');
        const screenOff = query<HTMLElement>('[data-intro="screen-off"]');
        const glow = query<HTMLElement>('[data-intro="glow"]');

        // Without the iMac there is nothing to animate. Never trap the scroll.
        if (!screenMark || !outlineSvg || !shadow || !screenOff || !glow) {
          gsap.set(loader, { display: "none" });
          finish();
          return;
        }

        ScrollTrigger.refresh();
        window.addEventListener("keydown", skip);
        window.addEventListener("click", skip);

        const tl = gsap.timeline({ onComplete: finish });
        timeline = tl;

        tl
          // 0.0 — the loader mark is on the page centre; its dot blinks 3x
          // (see Intro.module.css).
          .fromTo(
            loaderMark,
            { opacity: 0 },
            { opacity: 1, duration: 0.25, ease: "power1.out" },
            0,
          )
          // 1.6 — dissolve in place, fully gone at 2.1
          .to(
            loaderMark,
            {
              opacity: 0,
              filter: "blur(8px)",
              duration: 0.5,
              ease: "power1.in",
            },
            1.6,
          )
          .set(loader, { display: "none" }, OUTLINE_AT)
          // 2.1 — the outline draws itself (1.2 s in total)
          .to(
            outlinePaths,
            {
              strokeDashoffset: 0,
              duration: 0.8,
              ease: "power2.inOut",
              stagger: 0.1,
            },
            OUTLINE_AT,
          )
          // 3.2 — body and stand fill in, the screen powers on with a glow
          .to(
            bodyAndStand,
            { opacity: 1, duration: 0.6, ease: "power1.out" },
            3.2,
          )
          .to(shadow, { opacity: 1, duration: 0.6 }, 3.2)
          .to(outlineSvg, { opacity: 0, duration: 0.5 }, 3.3)
          .fromTo(
            glow,
            { opacity: 0 },
            { opacity: 0.85, duration: 0.2, ease: "power1.out" },
            3.2,
          )
          .to(glow, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, 3.4)
          .to(screenOff, { opacity: 0, duration: 0.5, ease: "power2.out" }, 3.2)
          // 3.8 — RG + dot inside the screen, at its exact centre
          .fromTo(
            screenMark,
            { opacity: 0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
            3.8,
          )
          // 4.4 — the timeline ends, which shows the hint and unlocks scroll
          .set({}, {}, TOTAL);

        if (hasSeenIntro()) {
          // Returning visitor: skip the loader RG, play the rest at speed.
          tl.timeScale((TOTAL - OUTLINE_AT) / RETURNING);
          tl.seek(OUTLINE_AT, true);
        }
      };

      const start = contextSafe ? contextSafe(run) : run;
      void document.fonts.ready.then(() => {
        if (!cancelled) start();
      });

      return () => {
        cancelled = true;
        detach();
      };
    },
    { scope: loaderRef, dependencies: [reduced] },
  );

  if (reduced) return null;

  return (
    <div ref={loaderRef} className={styles.loader} aria-hidden="true">
      <RgMark ref={markRef} className={styles.mark} />
    </div>
  );
}
