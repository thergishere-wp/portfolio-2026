"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useIntroState } from "@/lib/intro-state";
import {
  activeSectionAt,
  getScrollTargetsVersion,
  hasScrollTarget,
  scrollPositionOf,
  SECTION_ORDER,
  subscribeScrollTargets,
  type SectionId,
} from "@/lib/scroll-targets";
import { useLenis } from "@/lib/smooth-scroll";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import styles from "./SideNav.module.css";

const LABELS: Record<SectionId, string> = {
  about: "About",
  work: "Work",
  activity: "Activity",
  contact: "Contact",
};

/**
 * Right-edge section nav. Each button scrolls to a timeline label. Buttons
 * stay disabled until the stage that owns their section has registered.
 */
export function SideNav() {
  const lenis = useLenis();
  const reduced = usePrefersReducedMotion();
  const { unlocked } = useIntroState();
  const [active, setActive] = useState<SectionId | null>(null);

  // Re-render when a stage registers or unregisters its scroll target.
  useSyncExternalStore(
    subscribeScrollTargets,
    getScrollTargetsVersion,
    () => 0,
  );

  useEffect(() => {
    if (!lenis) return;
    const update = (): void => {
      const next = activeSectionAt(lenis.scroll, window.innerHeight * 0.6);
      setActive((prev) => (prev === next ? prev : next));
    };
    lenis.on("scroll", update);
    return () => lenis.off("scroll", update);
  }, [lenis]);

  const go = (id: SectionId): void => {
    const position = scrollPositionOf(id);
    if (position === null || !lenis) return;
    lenis.scrollTo(position, { duration: 2.2 });
  };

  // Reduced motion shows plain static sections; there is nothing to jump to.
  if (reduced) return null;

  return (
    <nav
      className={cn(styles.nav, unlocked && styles.show)}
      aria-label="Sections"
      inert={!unlocked}
    >
      {SECTION_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={cn(styles.item, active === id && styles.on)}
          disabled={!hasScrollTarget(id)}
          aria-current={active === id ? "true" : undefined}
          onClick={() => go(id)}
        >
          <span>{LABELS[id]}</span>
          <i aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
