"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import styles from "./Room.module.css";

/** The fixed white room. The window light drifts gently against the cursor. */
export function Room() {
  const sunRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const sun = sunRef.current;
      if (!sun || reduced) return;

      const toX = gsap.quickTo(sun, "x", { duration: 1.6, ease: "power3" });
      const toY = gsap.quickTo(sun, "y", { duration: 1.6, ease: "power3" });
      const onMove = (e: PointerEvent): void => {
        toX((e.clientX / window.innerWidth - 0.5) * -40);
        toY((e.clientY / window.innerHeight - 0.5) * -24);
      };

      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    },
    { dependencies: [reduced] },
  );

  return (
    <div className={styles.room} aria-hidden="true">
      <div className={styles.floor} />
      <div className={styles.cove} />
      <div ref={sunRef} className={styles.sun} />
      <div className={styles.vignette} />
    </div>
  );
}
