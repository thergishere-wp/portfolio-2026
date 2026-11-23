import { projectsAct } from "@/content/projects";
import styles from "./ProjectsAct.module.css";

/** The padlock over the window. The scroll story lifts its shackle to "unlock". */
export function Lock() {
  return (
    <div className={styles.lock} data-lock aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#141414"
        strokeWidth="1.3"
        strokeLinecap="round"
      >
        <path data-shackle d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2.5"
          fill="rgba(255,255,255,.7)"
        />
        <circle cx="12" cy="15.4" r="1.2" fill="#141414" stroke="none" />
        <path d="M12 16.4v1.8" />
      </svg>
      <p>{projectsAct.lockedLabel}</p>
    </div>
  );
}
