import type { KeyboardEvent, ReactNode, Ref } from "react";
import { projectsAct } from "@/content/projects";
import { cn } from "@/lib/cn";
import { Lock } from "./Lock";
import styles from "./ProjectsAct.module.css";

interface ProjectWindowProps {
  ref: Ref<HTMLDivElement>;
  /** Index of the revealed project, or -1 while locked. */
  current: number;
  /** Name of the revealed project, for the accessible label. */
  currentName: string | null;
  /** Domain for the URL bar, or null while locked. */
  domain: string | null;
  onOpen: () => void;
  /** The previews. */
  children: ReactNode;
}

/**
 * The glass browser window. Locked until the scroll story reveals a project;
 * then it is a button that expands the project, and the cursor becomes "OPEN".
 */
export function ProjectWindow({
  ref,
  current,
  currentName,
  domain,
  onOpen,
  children,
}: ProjectWindowProps) {
  const ready = current >= 0;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      ref={ref}
      className={cn("glass", styles.win, ready && styles.ready)}
      data-win
      data-cursor={ready ? "open" : undefined}
      role="button"
      tabIndex={ready ? 0 : -1}
      aria-disabled={!ready}
      aria-label={
        ready ? `Open ${currentName} preview` : "Project preview, locked"
      }
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <div className="wbar">
        <i />
        <i />
        <i />
        <div className="wbar-url">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span>{domain ?? "locked"}</span>
        </div>
      </div>
      <div className={styles.wbody}>
        {children}
        <Lock />
        <span className={styles.openHint}>{projectsAct.openHint}</span>
      </div>
    </div>
  );
}
