"use client";

import { useSyncExternalStore } from "react";

/**
 * The Dynamic Island on the cover screen reacts to the socials screen: while a
 * social icon is hovered or focused, the island shows that handle. The two
 * live in different parts of the DOM, so they share this tiny store.
 */
let hovered: string | null = null;
const listeners = new Set<() => void>();

export function setIslandHover(handle: string | null): void {
  if (hovered === handle) return;
  hovered = handle;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIslandHover(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => hovered,
    () => null,
  );
}
