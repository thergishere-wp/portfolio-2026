"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useBangkokTime } from "@/lib/time";
import styles from "./screen.module.css";

// MapLibre is heavy: it loads only after the Location tab has been opened.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

/**
 * The Location tab: a MapLibre map of Bangkok (OpenFreeMap tiles) over a
 * lightweight placeholder, then the facts. `active` is whether the tab is open.
 */
export function LocationMap({ active }: { active: boolean }) {
  const time = useBangkokTime("long");
  const [opened, setOpened] = useState(false);
  if (active && !opened) setOpened(true);

  return (
    <>
      <div className={styles.mapbox} role="img" aria-label="Map of Bangkok, Thailand">
        <span className={styles.pin} />
        <span className={styles.mapLabel}>Bangkok, Thailand</span>
        {opened ? <MapView /> : null}
      </div>
      <div className={styles.locinfo}>
        <div>
          <span>Based in</span>
          <b>Bangkok, Thailand</b>
        </div>
        <div>
          <span>Local time</span>
          <b>{time ?? "--"}</b>
        </div>
        <div>
          <span>Home</span>
          <b>Sri Lanka</b>
        </div>
        <div>
          <span>Clients</span>
          <b>TH · NZ · LK</b>
        </div>
      </div>
    </>
  );
}
