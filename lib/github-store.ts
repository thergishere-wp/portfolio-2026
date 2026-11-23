"use client";

import { useSyncExternalStore } from "react";
import type { ActivityPayload, ReposPayload } from "@/lib/github-types";

/**
 * Client-side home for the GitHub data. A module store (not React context)
 * because the phone's screen renders in its own React root inside drei's
 * <Html>, where context from the page does not reach. It polls the two route
 * handlers every 60 s while the tab is visible.
 */
export interface GithubState {
  activity: ActivityPayload | null;
  repos: ReposPayload | null;
  /** The network failed and there is no earlier data to fall back on. */
  unreachable: boolean;
}

const POLL_MS = 60_000;

let state: GithubState = { activity: null, repos: null, unreachable: false };
const listeners = new Set<() => void>();

function update(patch: Partial<GithubState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

let lastLoad = 0;

async function load(): Promise<void> {
  lastLoad = Date.now();
  const [activity, repos] = await Promise.allSettled([
    getJson<ActivityPayload>("/api/github/activity"),
    getJson<ReposPayload>("/api/github/repos"),
  ]);

  const patch: Partial<GithubState> = {};
  if (activity.status === "fulfilled") patch.activity = activity.value;
  else if (state.activity) patch.activity = { ...state.activity, stale: true };
  if (repos.status === "fulfilled") patch.repos = repos.value;
  else if (state.repos) patch.repos = { ...state.repos, stale: true };

  const reachedAnything =
    activity.status === "fulfilled" || repos.status === "fulfilled";
  patch.unreachable = !reachedAnything && !state.activity && !state.repos;
  update(patch);
}

let consumers = 0;
let timer: number | undefined;

function onVisible(): void {
  if (document.visibilityState === "visible" && Date.now() - lastLoad >= POLL_MS) {
    void load();
  }
}

/** Start polling. Returns a function that stops it (ref-counted). */
export function startGithubPolling(): () => void {
  consumers += 1;
  if (consumers === 1) {
    void load();
    timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    consumers -= 1;
    if (consumers === 0) {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): GithubState => state;

export function useGithub(): GithubState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
