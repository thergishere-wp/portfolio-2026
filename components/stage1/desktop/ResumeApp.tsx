import { resume } from "@/content/about";
import { cn } from "@/lib/cn";
import { DownloadIcon } from "./DockIcons";
import styles from "./desktop.module.css";

/** The Résumé app: a short pitch and the CV download. */
export function ResumeApp() {
  return (
    <div className={styles.resume}>
      <p className="eyebrow">{resume.eyebrow}</p>
      <h2 className={cn("h-serif", styles.resumeTitle)}>
        {resume.titleLead} <em>{resume.titleEmphasis}</em>
      </h2>
      <p className={styles.resumeNote}>{resume.note}</p>
      <a
        className={styles.download}
        href={resume.href}
        download={resume.fileName}
      >
        <DownloadIcon />
        {resume.cta}
      </a>
    </div>
  );
}
