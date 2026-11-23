import styles from "./screen.module.css";

/** Weeks shown, as in the app: about 20 weeks, 7 days each. */
export const GRID_WEEKS = 20;
const CELLS = GRID_WEEKS * 7;

interface ContributionGridProps {
  /**
   * One level (0 to 3) per day, oldest first, column by column. Null while the
   * data is not available: the grid then shows neutral cells, never fake data.
   */
  levels: number[] | null;
}

export function ContributionGrid({ levels }: ContributionGridProps) {
  return (
    <div
      className={styles.heat}
      role="img"
      aria-label={
        levels
          ? `Contribution activity over the last ${GRID_WEEKS} weeks`
          : "Contribution activity is not available yet"
      }
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const level = levels?.[i] ?? 0;
        return <i key={i} className={level > 0 ? styles[`l${Math.min(level, 3)}`] : undefined} />;
      })}
    </div>
  );
}
