"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny external store the intro uses to tell the rest of the page where it is.
 * `hint`: the scroll hint may appear. `unlocked`: scrolling has been released.
 */
export interface IntroState {
  hint: boolean;
  unlocked: boolean;
}

let state: IntroState = { hint: false, unlocked: false };
const listeners = new Set<() => void>();

export function setIntroState(patch: Partial<IntroState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): IntroState => state;

export function useIntroState(): IntroState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
