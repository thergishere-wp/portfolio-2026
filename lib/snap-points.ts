import type Snap from "lenis/snap";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Where Lenis Snap settles. Each stage registers a function returning its
 * step positions in pixels; they are re-read on every ScrollTrigger refresh
 * (resize, pin-spacing changes), so the snap points always match the labels.
 */
let snap: Snap | null = null;
const sources = new Set<() => number[]>();
let removers: Array<() => void> = [];

function apply(): void {
  removers.forEach((remove) => remove());
  removers = [];
  if (!snap) return;
  const positions = new Set<number>([0]);
  sources.forEach((read) => read().forEach((p) => positions.add(Math.round(p))));
  positions.forEach((p) => {
    if (snap) removers.push(snap.add(p));
  });
}

ScrollTrigger.addEventListener("refresh", apply);

/** Called by the smooth-scroll provider once Lenis Snap exists (or is gone). */
export function attachSnap(instance: Snap | null): void {
  snap = instance;
  apply();
}

/** Register a stage's snap positions. Returns an unregister function. */
export function registerSnapSource(read: () => number[]): () => void {
  sources.add(read);
  apply();
  return () => {
    sources.delete(read);
    apply();
  };
}
