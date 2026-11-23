import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import styles from "./ProjectsAct.module.css";

/** The floating glass card with a project's overview and stack. */
export function OverviewCard({ project }: { project: Project }) {
  return (
    <div className={cn("glass", styles.minic)} data-minic>
      <p className="eyebrow">Overview</p>
      <p>{project.overview}</p>
      <div className={styles.tags}>
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
