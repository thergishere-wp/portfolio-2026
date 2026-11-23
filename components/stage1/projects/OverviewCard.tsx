import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import styles from "./ProjectsAct.module.css";

/**
 * The floating glass card with a project's overview and stack. There is one
 * card for the whole act: the step shows and hides it, and a new project only
 * swaps what is inside (the body is keyed, so it fades in again).
 */
export function OverviewCard({ project }: { project: Project }) {
  return (
    <div className={cn("glass", styles.minic)} data-minic>
      <div key={project.id} className={styles.mincBody}>
        <p className="eyebrow">Overview</p>
        <p>{project.overview}</p>
        <div className={styles.tags}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
