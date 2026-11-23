import type { ReactNode } from "react";
import styles from "./ImacScreen.module.css";

/**
 * The screen's content surface. It is laid out at full "cover" size and scaled
 * by 1/S, and the safe box inside is exactly one viewport, so content is
 * pixel-crisp at 1:1 once the iMac is fully zoomed.
 */
export function ImacScreen({ children }: { children: ReactNode }) {
  return (
    <div className={styles.inner}>
      <div className={styles.safe}>{children}</div>
    </div>
  );
}
