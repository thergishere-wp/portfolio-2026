"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { useBangkokTime } from "@/lib/time";
import { ActivityFeed } from "./ActivityFeed";
import { ContributionGrid } from "./ContributionGrid";
import { LocationMap } from "./LocationMap";
import styles from "./screen.module.css";

type Tab = "activity" | "location";

/**
 * The phone app: status bar with live Bangkok time, the profile header, an
 * Activity | Location segmented control with a sliding knob, and its panes.
 */
export function AppScreen() {
  const clock = useBangkokTime("short");
  const [tab, setTab] = useState<Tab>("activity");

  return (
    <div className={styles.app}>
      <div className={styles.sbar} aria-hidden="true">
        <span>{clock ?? "--:--"}</span>
        <span className={styles.ic}>
          <i className={styles.icSignal} />
          <i className={styles.icBattery} />
        </span>
      </div>

      <div className={styles.who}>
        <Image
          className={styles.avatar}
          src="/img/portrait.jpg"
          alt=""
          width={80}
          height={80}
        />
        <div>
          <b>Pasindu</b>
          <span>@thergishere-wp</span>
        </div>
      </div>

      <div
        className={cn(styles.seg, tab === "location" && styles.loc)}
        role="tablist"
        aria-label="Activity or location"
      >
        <span className={styles.knob} aria-hidden="true" />
        <button
          type="button"
          role="tab"
          id="phone-tab-activity"
          aria-selected={tab === "activity"}
          aria-controls="phone-pane-activity"
          className={cn(tab === "activity" && styles.on)}
          onClick={() => setTab("activity")}
        >
          Activity
        </button>
        <button
          type="button"
          role="tab"
          id="phone-tab-location"
          aria-selected={tab === "location"}
          aria-controls="phone-pane-location"
          className={cn(tab === "location" && styles.on)}
          onClick={() => setTab("location")}
        >
          Location
        </button>
      </div>

      <div className={styles.panes}>
        <div
          id="phone-pane-activity"
          role="tabpanel"
          aria-labelledby="phone-tab-activity"
          className={cn(styles.pane, tab !== "activity" && styles.off)}
          inert={tab !== "activity"}
        >
          <ContributionGrid levels={null} />
          <ActivityFeed items={null} />
        </div>
        <div
          id="phone-pane-location"
          role="tabpanel"
          aria-labelledby="phone-tab-location"
          className={cn(styles.pane, tab !== "location" && styles.off)}
          inert={tab !== "location"}
        >
          <LocationMap />
        </div>
      </div>
    </div>
  );
}
