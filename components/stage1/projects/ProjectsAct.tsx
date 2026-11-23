"use client";

import { useRef, useState } from "react";
import { projects, projectsAct, type Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import { OverviewCard } from "./OverviewCard";
import { ProjectList } from "./ProjectList";
import { ProjectPreview } from "./ProjectPreview";
import { ProjectViewer } from "./ProjectViewer";
import { ProjectWindow } from "./ProjectWindow";
import styles from "./ProjectsAct.module.css";

interface ViewerState {
  project: Project;
  from: DOMRect;
}

/**
 * The projects act. `current` is the project the scroll story has revealed
 * (-1 while locked); the timeline drives it. Only the current and the next
 * preview are mounted, so at most two frames are alive at once.
 */
export function ProjectsAct({
  current,
  near,
}: {
  current: number;
  /** The scroll story is close to this act: previews may start loading. */
  near: boolean;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const active = current >= 0 ? projects[current] : null;

  const openViewer = (): void => {
    const el = windowRef.current;
    if (!active || !el) return;
    setViewer({ project: active, from: el.getBoundingClientRect() });
  };

  return (
    <>
      <div className={cn(styles.orb, styles.orbA)} data-orb aria-hidden="true" />
      <div className={cn(styles.orb, styles.orbB)} data-orb aria-hidden="true" />
      <div className={styles.act2}>
        <div className={styles.left}>
          <p className="eyebrow" data-a2-rv>
            {projectsAct.eyebrow}
          </p>
          <h2 className={cn("h-serif", styles.title)} data-a2-rv>
            {projectsAct.title}
          </h2>
          <ProjectList />
        </div>
        <ProjectWindow
          ref={windowRef}
          current={current}
          currentName={active?.name ?? null}
          domain={active?.domain ?? null}
          onOpen={openViewer}
        >
          {projects.map((project, i) => (
            <ProjectPreview
              key={project.id}
              project={project}
              // Nothing loads until the act is near, so no third-party page is
              // fetched at page load. Then only the current and the next one.
              mounted={near && (i === current || i === current + 1)}
              near={near}
            />
          ))}
        </ProjectWindow>
        <div className={styles.minis}>
          {projects.map((project) => (
            <OverviewCard key={project.id} project={project} />
          ))}
        </div>
      </div>
      {viewer ? (
        <ProjectViewer
          project={viewer.project}
          from={viewer.from}
          windowRef={windowRef}
          onClosed={() => setViewer(null)}
        />
      ) : null}
    </>
  );
}
