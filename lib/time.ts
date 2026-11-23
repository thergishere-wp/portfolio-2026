"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const TIME_ZONE = "Asia/Bangkok";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const time = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * menubar: "Mon 23 Nov 14:58"
 * short:   "14:58"
 * long:    "14:58 · UTC+7"
 */
export type ClockVariant = "menubar" | "short" | "long";

export function formatBangkok(variant: ClockVariant, date: Date): string {
  switch (variant) {
    case "menubar":
      return dateTime.format(date).replaceAll(",", "");
    case "short":
      return time.format(date);
    case "long":
      return `${time.format(date)} · UTC+7`;
  }
}

/**
 * Relative time from an ISO timestamp.
 * long:  "6 min ago", "2 hours ago", "3 days ago"
 * short: "6m", "2h", "3d"
 */
export function formatRelative(
  iso: string,
  style: "long" | "short" = "long",
  now: number = Date.now(),
): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  const units: Array<[number, string, string, string]> = [
    [60, "m", " min", " min"],
    [60 * 24, "h", " hour", " hours"],
    [60 * 24 * 30, "d", " day", " days"],
    [60 * 24 * 365, "mo", " month", " months"],
  ];
  if (seconds < 60) return style === "short" ? "now" : "just now";

  const minutes = Math.floor(seconds / 60);
  let value = minutes;
  let divisor = 1;
  for (const [limit, short, singular, plural] of units) {
    if (minutes < limit) {
      value = Math.floor(minutes / divisor);
      if (style === "short") return `${value}${short}`;
      return `${value}${value === 1 ? singular : plural} ago`;
    }
    divisor = limit;
  }
  value = Math.floor(minutes / (60 * 24 * 365));
  return style === "short" ? `${value}y` : `${value} ${value === 1 ? "year" : "years"} ago`;
}

const NOW_TICK_MS = 30_000;
let nowValue = 0;

function subscribeNow(onChange: () => void): () => void {
  nowValue = Date.now();
  const id = window.setInterval(() => {
    nowValue = Date.now();
    onChange();
  }, NOW_TICK_MS);
  return () => window.clearInterval(id);
}

/**
 * Current time in ms, refreshed every 30 s so relative times stay fresh. It is
 * 0 during server rendering and the first client render (Cache Components
 * forbids reading the clock while prerendering), then the real time.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, () => nowValue, () => 0);
}

/**
 * Live Bangkok time. Returns null until mounted, so server and first client
 * render match, then updates on an interval.
 */
export function useBangkokTime(
  variant: ClockVariant,
  intervalMs = 15_000,
): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const update = (): void => setValue(formatBangkok(variant, new Date()));
    update();
    const id = window.setInterval(update, intervalMs);
    return () => window.clearInterval(id);
  }, [variant, intervalMs]);

  return value;
}
