import { projects, projectsAct } from "@/content/projects";
import { cn } from "@/lib/cn";
import styles from "./ProjectsAct.module.css";

/** Reduced motion: the projects as a plain list of cards. */
export function ProjectsStatic() {
  return (
    <section
      id="work"
      className={styles.staticWork}
      aria-labelledby="work-title"
    >
      <p className="eyebrow">{projectsAct.eyebrow}</p>
      <h2 id="work-title" className={cn("h-serif", styles.title)}>
        {projectsAct.title}
      </h2>
      <ol className={styles.staticList}>
        {projects.map((project) => (
          <li key={project.id} className={cn("mwin", styles.staticCard)}>
            <h3>{project.name}</h3>
            {project.liveUrl ? (
              <a
                className={styles.staticDomain}
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.domain} ↗
              </a>
            ) : (
              <span className={styles.soon}>{projectsAct.soonPill}</span>
            )}
            <p>{project.overview}</p>
            <div className={cn("chips", styles.tags)}>
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
