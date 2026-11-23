"use client";

import { projects, projectsAct } from "@/content/projects";
import { cn } from "@/lib/cn";
import { OverviewCard } from "./OverviewCard";
import { ProjectList } from "./ProjectList";
import styles from "./ProjectsAct.module.css";

/**
 * The projects act's DOM: the title and the list on the left, the overview
 * card in the middle. The device on the right is 3D (the story's canvas). The
 * step drives everything here; `current` is the project it has unlocked
 * (-1 while locked). There is ONE overview card: its content swaps.
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
        {/* The scrub owns this wrapper (it leaves first when the phone folds);
            the step owns the one card inside it. */}
        <div className={styles.minis} data-minis>
          <OverviewCard project={projects[Math.max(0, current)]} />
        </div>
      </div>
    </>
  );
}
