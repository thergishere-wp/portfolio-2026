"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import styles from "./Cursor.module.css";

/**
 * A small ink dot that follows the pointer. It grows into a violet "OPEN"
 * disc over any element marked data-cursor="open". Hidden on touch devices.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: none)").matches) return;

    const toX = gsap.quickTo(el, "x", { duration: 0.25, ease: "power3" });
    const toY = gsap.quickTo(el, "y", { duration: 0.25, ease: "power3" });

    const onMove = (e: PointerEvent): void => {
      toX(e.clientX);
      toY(e.clientY);
      el.dataset.visible = "true";
      const overOpen =
        e.target instanceof Element &&
        e.target.closest('[data-cursor="open"]') !== null;
      el.dataset.big = overOpen ? "true" : "false";
    };

    // A click usually opens something over the target; the next move re-checks.
    const onClick = (): void => {
      el.dataset.big = "false";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={ref} className={styles.cursor} aria-hidden="true">
      <span>OPEN</span>
    </div>
  );
}
