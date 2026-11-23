"use client";

import { useState } from "react";
import type { PushGroup } from "@/lib/github-types";
import { cn } from "@/lib/cn";
import { formatRelative, useNow } from "@/lib/time";
import styles from "./screen.module.css";

const COMMIT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M3 12h5.5M15.5 12H21" />
  </svg>
);

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export type FeedStatus =
  /** Waiting for the first response. */
  | "loading"
  /** Showing data. `stale` flips the header to "reconnecting". */
  | "ready"
  /** The network failed and there is nothing to show. */
  | "unreachable";

interface ActivityFeedProps {
  status: FeedStatus;
  /** Newest first. */
  items: PushGroup[];
  /** GitHub is failing and these are the last good rows. */
  stale: boolean;
}

const rowKey = (item: PushGroup): string => `${item.repo}-${item.at}`;

function ago(iso: string, now: number): string {
  const rel = formatRelative(iso, "short", now);
  return rel === "now" ? "just now" : `${rel} ago`;
}

/**
 * Real pushes, newest first. Private repositories show a lock, the repo name
 * and "N commits · private repository", never a message (the server has
 * already stripped it). New rows slide in. With nothing to show it says so
 * honestly instead of inventing rows.
 */
export function ActivityFeed({ status, items, stale }: ActivityFeedProps) {
  const now = useNow();

  // Remember which rows were there, so only genuinely new ones animate.
  const keys = status === "ready" ? items.map(rowKey) : null;
  const signature = keys ? keys.join("|") : null;
  const [tracked, setTracked] = useState<{
    signature: string | null;
    fresh: string[];
  }>({ signature: null, fresh: [] });

  if (signature !== tracked.signature) {
    const before = tracked.signature ? tracked.signature.split("|") : null;
    setTracked({
      signature,
      fresh: before && keys ? keys.filter((k) => !before.includes(k)) : [],
    });
  }

  let headline = "Recent pushes";
  if (status === "ready") {
    if (stale) headline = "Live · reconnecting";
    else if (items.length > 0) headline = `Live · last push ${ago(items[0].at, now)}`;
    else headline = "Live";
  }

  return (
    <>
      <div className={styles.feedhead}>
        <span className={cn(styles.feedStatus, status === "ready" && styles.live)}>
          {headline}
        </span>
        <span>last 14 days</span>
      </div>

      {status === "ready" && items.length > 0 ? (
        <ul className={styles.feed}>
          {items.map((item) => {
            const key = rowKey(item);
            return (
              <li key={key} className={tracked.fresh.includes(key) ? styles.feedNew : undefined}>
                <span className={styles.feedIcon}>
                  {item.private ? LOCK_ICON : COMMIT_ICON}
                </span>
                <span className={styles.msg}>
                  <b>{item.repo}</b>
                  <span>
                    {item.private
                      ? `${item.count} ${item.count === 1 ? "commit" : "commits"} · private repository`
                      : `${item.count > 1 ? `${item.count} commits · ` : ""}${item.message ?? ""}`}
                  </span>
                </span>
                <time dateTime={item.at}>{formatRelative(item.at, "short", now)}</time>
              </li>
            );
          })}
        </ul>
      ) : status === "loading" ? (
        <ul className={cn(styles.feed, styles.skel)} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} />
          ))}
        </ul>
      ) : (
        <p className={styles.note}>
          {status === "unreachable"
            ? "Couldn't reach GitHub right now."
            : "No pushes in the last 14 days."}
        </p>
      )}
    </>
  );
}
