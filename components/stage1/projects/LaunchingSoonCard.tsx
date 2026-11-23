import { projectsAct, soonCard } from "@/content/projects";
import styles from "./LaunchingSoonCard.module.css";

/** Stands in for a site that is not live yet. Fills its positioned parent. */
export function LaunchingSoonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.in}>
        <div className={styles.top} data-reveal>
          <span className={styles.logo}>
            {soonCard.logo}
            <i>.</i>
          </span>
          <span className={styles.pill}>{projectsAct.soonPill}</span>
        </div>
        <h3 className={styles.title} data-reveal>
          {soonCard.titleLead} <em>{soonCard.titleEmphasis}</em>
        </h3>
        <div className={styles.row} data-reveal>
          {soonCard.chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
