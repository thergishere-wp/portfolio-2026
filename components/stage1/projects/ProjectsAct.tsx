"use client";

import { projects, projectsAct } from "@/content/projects";
import { cn } from "@/lib/cn";
import { OverviewCard } from "./OverviewCard";
import { ProjectList } from "./ProjectList";
import styles from "./ProjectsAct.module.css";

/**
 * The projects act's DOM: the title and the list on the left, the overview
 * cards in the middle. The device on the right is 3D (the story's canvas). The
 * steps drive everything here; `current` is the project they have unlocked
 * (-1 while locked).
 */
export function ProjectsAct({
  current,
  onSelect,
}: {
  current: number;
  /** Jump to a project's step. */
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <div className={cn(styles.orb, styles.orbA)} data-orb aria-hidden="true" />
      <div className={cn(styles.orb, styles.orbB)} data-orb aria-hidden="true" />
      <div className={styles.act2} data-projects-dom>
        <div className={styles.left}>
          <p className="eyebrow" data-a2-rv>
            {projectsAct.eyebrow}
          </p>
          <h2 className={cn("h-serif", styles.title)} data-a2-rv>
            {projectsAct.title}
          </h2>
          <ProjectList current={current} onSelect={onSelect} />
        </div>
        <div className={styles.minis}>
          {projects.map((project) => (
            <OverviewCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </>
  );
}
