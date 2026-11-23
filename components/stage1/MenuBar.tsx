"use client";

import { menuBar } from "@/content/about";
import { useBangkokTime } from "@/lib/time";
import styles from "./MenuBar.module.css";

/** The macOS-style menu bar inside the iMac screen, with the live Bangkok clock. */
export function MenuBar() {
  const clock = useBangkokTime("menubar");

  return (
    <div className={styles.menubar} data-menubar aria-hidden="true">
      <span className={styles.miniMark}>
        {menuBar.mark}
        <i />
      </span>
      <b>{menuBar.owner}</b>
      {menuBar.items.map((item) => (
        <span key={item}>{item}</span>
      ))}
      <div className={styles.right}>
        <span className={styles.live}>{menuBar.status}</span>
        <span>{menuBar.city}</span>
        <span>{clock ?? "--"}</span>
      </div>
    </div>
  );
}
