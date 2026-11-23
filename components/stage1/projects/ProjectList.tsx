import { projects } from "@/content/projects";
import styles from "./ProjectsAct.module.css";

/** The numbered list. The timeline greys each name out and turns the current one violet. */
export function ProjectList() {
  return (
    <ol className={styles.plist}>
      {projects.map((project, i) => (
        <li key={project.id} className={styles.p} data-p>
          <span className={styles.pn} data-ptext>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className={styles.pt} data-ptext>
            {project.name}
          </span>
        </li>
      ))}
    </ol>
  );
}
