"use client";

import type { gsap } from "@/lib/gsap";

/**
 * Registry of the scroll positions the side nav can jump to. Each stage
 * registers a timeline label; the position is derived from the timeline's
 * ScrollTrigger at click time, so it stays correct after a resize refresh.
 */
export type SectionId = "about" | "work" | "activity" | "contact";

export const SECTION_ORDER: readonly SectionId[] = [
  "about",
  "work",
  "activity",
  "contact",
];

interface Target {
  timeline: gsap.core.Timeline;
  label: string;
}

const targets = new Map<SectionId, Target>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Register a section. Returns an unregister function. */
export function registerScrollTarget(
  id: SectionId,
  timeline: gsap.core.Timeline,
  label: string,
): () => void {
  targets.set(id, { timeline, label });
  notify();
  return () => {
    if (targets.get(id)?.timeline === timeline) {
      targets.delete(id);
      notify();
    }
  };
}

export function hasScrollTarget(id: SectionId): boolean {
  return targets.has(id);
}

/** Scroll position (px) of a section, or null if unregistered or not ready. */
export function scrollPositionOf(id: SectionId): number | null {
  const target = targets.get(id);
  const trigger = target?.timeline.scrollTrigger;
  if (!target || !trigger) return null;
  const duration = target.timeline.duration();
  if (duration === 0) return null;
  const at = target.timeline.labels[target.label];
  if (at === undefined) return null;
  return trigger.start + (trigger.end - trigger.start) * (at / duration);
}

/** The last section whose position is within `lead` px of the scroll. */
export function activeSectionAt(scroll: number, lead: number): SectionId | null {
  let active: SectionId | null = null;
  for (const id of SECTION_ORDER) {
    const position = scrollPositionOf(id);
    if (position !== null && scroll >= position - lead) active = id;
  }
  return active;
}

export function subscribeScrollTargets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getScrollTargetsVersion = (): number => version;
