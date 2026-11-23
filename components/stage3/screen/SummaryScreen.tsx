"use client";

import { useMemo } from "react";
import { computeStats } from "@/lib/activity-stats";
import type { CommitStamp } from "@/lib/github-types";
import { useNow } from "@/lib/time";
import { ActivityRings } from "./ActivityRings";
import type { FeedStatus } from "./ActivityFeed";
import { MostActive } from "./MostActive";
import { TimeChart } from "./TimeChart";
import styles from "./summary.module.css";

interface SummaryScreenProps {
  status: FeedStatus;
  commits: readonly CommitStamp[];
  /** The screen has been seen: the rings and bars draw in. */
  viewed: boolean;
}

/**
 * "Screen Time for code": rings, a coding-time chart and the most active
 * repositories, all counted from real commit timestamps. It scrolls inside
 * the phone (data-lenis-prevent keeps smooth scroll from hijacking it). With
 * no data it says so; nothing is invented.
 */
export function SummaryScreen({ status, commits, viewed }: SummaryScreenProps) {
  const now = useNow();
  // useNow is 0 until the first client tick; wait for a real clock.
  const stats = useMemo(
    () => (status === "ready" && now > 0 ? computeStats(commits, now) : null),
    [status, commits, now],
  );

  return (
    <div
      className={styles.scroll}
      data-lenis-prevent
      role="region"
      aria-label="Activity summary"
      tabIndex={0}
    >
      {stats ? (
        <>
          <ActivityRings stats={stats} viewed={viewed} />
          <TimeChart stats={stats} viewed={viewed} />
          <MostActive repos={stats.topRepos} viewed={viewed} />
        </>
      ) : status === "unreachable" ? (
        <p className={styles.empty}>Couldn&apos;t reach GitHub right now.</p>
      ) : (
        <div className={styles.skeleton} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}
