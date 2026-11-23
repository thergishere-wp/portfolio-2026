"use client";

import { useEffect, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useIntroState } from "@/lib/intro-state";
import styles from "./ScrollHint.module.css";

/** "Scroll" cue. Appears at the end of the intro, hides once scrolling starts. */
export function ScrollHint() {
  const { hint } = useIntroState();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 10,
      onEnter: () => setScrolled(true),
      onLeaveBack: () => setScrolled(false),
    });
    return () => trigger.kill();
  }, []);

  return (
    <div
      className={cn(styles.hint, hint && !scrolled && styles.visible)}
      aria-hidden="true"
    >
      Scroll
      <div className={styles.line} />
    </div>
  );
}
