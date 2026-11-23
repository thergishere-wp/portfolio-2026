import styles from "./Grain.module.css";

/** Fixed film grain over everything. Decorative only. */
export function Grain() {
  return <div className={styles.grain} aria-hidden="true" />;
}
