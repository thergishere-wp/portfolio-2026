"use client";

import { useBangkokTime } from "@/lib/time";
import styles from "./screen.module.css";

/**
 * The Location tab. For now the map is a placeholder block; the real MapLibre
 * map (OpenFreeMap, centred on Bangkok) replaces it and loads lazily when this
 * tab opens. The facts below are real.
 */
export function LocationMap() {
  const time = useBangkokTime("long");

  return (
    <>
      <div className={styles.mapbox} role="img" aria-label="Map of Bangkok, Thailand">
        <span className={styles.pin} />
        <span className={styles.mapLabel}>Bangkok, Thailand</span>
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
