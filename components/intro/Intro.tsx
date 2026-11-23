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

/**
 * Time-based intro: RG letters rise in, the iMac outline draws itself, the
 * body fades in and the screen powers on, then the loader's "RG" flies into
 * the screen (FLIP) and scrolling unlocks. Skipped under reduced motion.
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

      const finish = (): void => {
        unlockScroll(lenisRef.current);
        setIntroState({ unlocked: true });
      };

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

        // Without the iMac there is nothing to animate. Never trap the scroll.
        if (!screenMark || !outlineSvg || !shadow || !screenOff) {
          gsap.set(loader, { display: "none" });
          finish();
          return;
        }

        // Layout first, then measure both marks for the FLIP hand-off.
        ScrollTrigger.refresh();
        const from = loaderMark.getBoundingClientRect();
        const to = screenMark.getBoundingClientRect();
        const scale = to.width / from.width;
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);

        gsap
          .timeline({ onComplete: finish })
          .from(
            loaderMark.querySelectorAll("[data-ch]"),
            { yPercent: 120, duration: 1, ease: "expo.out", stagger: 0.09 },
            0.2,
          )
          .from(
            loaderMark.querySelector("[data-dot]"),
            { scale: 0, duration: 0.5, ease: "back.out(3)" },
            0.8,
          )
          .to(
            outlinePaths,
            {
              strokeDashoffset: 0,
              duration: 1.5,
              ease: "power2.inOut",
              stagger: 0.14,
            },
            2.4,
          )
          .to(
            bodyAndStand,
            { opacity: 1, duration: 0.8, ease: "power1.out" },
            3.6,
          )
          .to(shadow, { opacity: 1, duration: 1 }, 3.6)
          .to(outlineSvg, { opacity: 0, duration: 0.7 }, 3.9)
          .to(screenOff, { opacity: 0, duration: 0.7, ease: "power2.in" }, 4.1)
          .to(
            loaderMark,
            { x: dx, y: dy, scale, duration: 1.1, ease: "expo.inOut" },
            4.2,
          )
          .set(screenMark, { opacity: 1 }, 5.3)
          .set(loader, { display: "none" }, 5.3)
          .call(() => setIntroState({ hint: true }), [], 5.4)
          .to({}, { duration: 0.6 }, 5.4);
      };

      const start = contextSafe ? contextSafe(run) : run;
      void document.fonts.ready.then(() => {
        if (!cancelled) start();
      });

      return () => {
        cancelled = true;
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
