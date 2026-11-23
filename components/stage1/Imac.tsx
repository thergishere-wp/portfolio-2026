import type { ReactNode, Ref } from "react";
import type { StageLayout } from "@/lib/stage-layout";
import styles from "./Imac.module.css";

interface ImacProps {
  ref: Ref<HTMLDivElement>;
  layout: StageLayout | null;
  /** The screen's content (see ImacScreen). */
  children: ReactNode;
}

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
}

/** The strokes the intro draws: body, screen, chin line, neck, foot. */
function outlinePaths(l: StageLayout): string[] {
  const { bodyW, bodyH, bezel, ws, hs, radius, neck, foot, neckW, footW, chin } =
    l;
  return [
    roundedRect(0.6, 0.6, bodyW - 1.2, bodyH - 1.2, radius),
    roundedRect(bezel, bezel, ws, hs, 3),
    `M0.6,${bodyH - chin}H${bodyW - 0.6}`,
    `M${(bodyW - neckW) / 2},${bodyH}V${bodyH + neck}M${(bodyW + neckW) / 2},${bodyH}V${bodyH + neck}`,
    roundedRect((bodyW - footW) / 2, bodyH + neck, footW, foot, 2),
  ];
}

/**
 * The iMac: outline (drawn by the intro), body, screen, chin, stand and
 * floor shadow. Elements the intro animates carry data-intro hooks.
 */
export function Imac({ ref, layout, children }: ImacProps) {
  return (
    <div ref={ref} className={styles.imac} data-imac>
      <svg
        className={styles.outline}
        aria-hidden="true"
        data-intro="outline"
        width={layout?.bodyW}
        height={layout?.total}
        viewBox={layout ? `0 0 ${layout.bodyW} ${layout.total}` : undefined}
      >
        {layout &&
          outlinePaths(layout).map((d, i) => (
            <path key={i} pathLength={1} d={d} />
          ))}
      </svg>
      <div className={styles.body} data-intro="body">
        <div className={styles.screen} data-screen>
          {children}
          <div className={styles.glare} data-glare />
          <div className={styles.screenOff} data-intro="screen-off" />
        </div>
        <div className={styles.chin} />
      </div>
      <div className={styles.stand} data-intro="stand">
        <div className={styles.neck} />
        <div className={styles.foot} />
      </div>
      <div className={styles.shadow} data-intro="shadow" />
    </div>
  );
}
