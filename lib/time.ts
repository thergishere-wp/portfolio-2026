"use client";

import { useEffect, useState } from "react";

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
