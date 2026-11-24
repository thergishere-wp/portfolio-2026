"use client";

import { useMemo, useRef } from "react";
import { computeStats } from "@/lib/activity-stats";
import type { CommitStamp } from "@/lib/github-types";
import { useNow } from "@/lib/time";
import { useWheelHandoff } from "@/lib/useWheelHandoff";
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
 * the phone (it takes the wheel only while it can scroll, see useWheelHandoff). With
 * no data it says so; nothing is invented.
 */
export function SummaryScreen({ status, commits, viewed }: SummaryScreenProps) {
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Scrolls inside the phone only while it can; otherwise the wheel moves the page.
  useWheelHandoff(scrollRef);
  // useNow is 0 until the first client tick; wait for a real clock.
  const stats = useMemo(
    () => (status === "ready" && now > 0 ? computeStats(commits, now) : null),
    [status, commits, now],
  );

  return (
    <div
      ref={scrollRef}
      className={styles.scroll}
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
