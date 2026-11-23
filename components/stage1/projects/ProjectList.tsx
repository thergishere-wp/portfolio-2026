import { projects } from "@/content/projects";
import styles from "./ProjectsAct.module.css";

/**
 * The numbered list. Each name is a button that jumps straight to that
 * project's step. The steps grey each name out and turn the current one violet.
 */
export function ProjectList({
  current,
  onSelect,
}: {
  /** The project the story has unlocked (-1 while locked). */
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className={styles.plist}>
      {projects.map((project, i) => (
        <li key={project.id} className={styles.p} data-p>
          <button
            type="button"
            className={styles.pbtn}
            aria-current={i === current ? "true" : undefined}
            onClick={() => onSelect(i)}
          >
            <span className={styles.pn} data-ptext>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={styles.pt} data-ptext>
              {project.name}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
