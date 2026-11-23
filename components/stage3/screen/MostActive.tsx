import { repoInitials, type RepoTotal } from "@/lib/activity-stats";
import styles from "./summary.module.css";

const LOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * A Screen Time "most used" list: the top repositories of the week, each with
 * a rounded-square initials icon, a thin bar relative to the busiest one and
 * its commit count. Private repositories show a lock and nothing else.
 */
export function MostActive({
  repos,
  viewed,
}: {
  repos: RepoTotal[];
  viewed: boolean;
}) {
  const max = Math.max(...repos.map((r) => r.count), 1);

  return (
    <section className={styles.card} aria-labelledby="most-active-title">
      <h3 id="most-active-title" className={styles.cardTitle}>
        Most active
      </h3>
      {repos.length === 0 ? (
        <p className={styles.empty}>No commits in the last 7 days.</p>
      ) : (
        <ol className={styles.repoList}>
          {repos.map((repo, i) => (
            <li key={repo.repo} className={styles.repoRow}>
              <span className={styles.repoIcon} data-tone={i % 4} aria-hidden="true">
                {repoInitials(repo.repo)}
              </span>
              <div className={styles.repoBody}>
                <div className={styles.repoTop}>
                  <b className={styles.repoName}>
                    {repo.repo}
                    {repo.private ? (
                      <span className={styles.lock} role="img" aria-label="Private repository">
                        {LOCK}
                      </span>
                    ) : null}
                  </b>
                  <span className={styles.repoCount}>
                    {repo.count} {repo.count === 1 ? "commit" : "commits"}
                  </span>
                </div>
                <span className={styles.repoBar} aria-hidden="true">
                  <i
                    style={{
                      width: viewed ? `${(repo.count / max) * 100}%` : "0%",
                      transitionDelay: `${i * 90}ms`,
                    }}
                  />
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
