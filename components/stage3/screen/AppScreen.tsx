"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { useGithub } from "@/lib/github-store";
import { gsap } from "@/lib/gsap";
import type { PhoneRig } from "@/lib/phone-rig";
import { useBangkokTime } from "@/lib/time";
import { ActivityFeed, type FeedStatus } from "./ActivityFeed";
import { LocationMap } from "./LocationMap";
import { SummaryScreen } from "./SummaryScreen";
import styles from "./screen.module.css";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "pushes", label: "Pushes" },
  { id: "location", label: "Location" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/**
 * True once the app layer has been on screen: the rings and bars draw in the
 * first time it is seen, not while it is still hidden at page load.
 */
function useSeen(rig: PhoneRig): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return;
    const check = (): void => {
      if (rig.app > 0.6) setSeen(true);
    };
    check();
    gsap.ticker.add(check);
    return () => gsap.ticker.remove(check);
  }, [rig, seen]);
  return seen;
}

/**
 * The phone app: status bar with live Bangkok time, the profile header, a
 * Summary | Pushes | Location segmented control with a sliding knob, and its
 * panes.
 */
export function AppScreen({ rig }: { rig: PhoneRig }) {
  const clock = useBangkokTime("short");
  const [tab, setTab] = useState<Tab>("summary");
  const { activity, unreachable } = useGithub();
  const seen = useSeen(rig);

  const feedStatus: FeedStatus = activity
    ? "ready"
    : unreachable
      ? "unreachable"
      : "loading";
  const index = TABS.findIndex((t) => t.id === tab);

  const paneProps = (id: Tab) =>
    ({
      id: `phone-pane-${id}`,
      role: "tabpanel",
      "aria-labelledby": `phone-tab-${id}`,
      className: cn(styles.pane, tab !== id && styles.off),
      inert: tab !== id,
    }) as const;

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
        className={cn(styles.seg, styles[`tab${index}`])}
        role="tablist"
        aria-label="Summary, pushes or location"
      >
        <span className={styles.knob} aria-hidden="true" />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`phone-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`phone-pane-${t.id}`}
            className={cn(tab === t.id && styles.on)}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.panes}>
        <div {...paneProps("summary")}>
          <SummaryScreen
            status={feedStatus}
            commits={activity?.commits ?? []}
            viewed={seen}
          />
        </div>
        <div {...paneProps("pushes")}>
          <ActivityFeed
            status={feedStatus}
            items={activity?.pushes ?? []}
            stale={activity?.stale ?? false}
          />
        </div>
        <div {...paneProps("location")}>
          <LocationMap active={tab === "location"} />
        </div>
      </div>
    </div>
  );
}
