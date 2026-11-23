"use client";

import type { RepoSummary } from "@/lib/github-types";
import { cn } from "@/lib/cn";
import { formatRelative, useNow } from "@/lib/time";
import styles from "./ReposWindow.module.css";

const LOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

function RepoRow({ repo, now }: { repo: RepoSummary; now: number }) {
  const body = (
    <>
      <b>
        {repo.private ? LOCK : null}
        {repo.name}
      </b>
      <span className={styles.badge}>{repo.private ? "Private" : "Public ↗"}</span>
      {repo.description ? <p>{repo.description}</p> : null}
      <span className={styles.meta}>
        {repo.language ? (
          <span>
            <i style={{ background: repo.languageColor ?? "#8e8b85" }} />
            {repo.language}
          </span>
        ) : null}
        <span>Updated {formatRelative(repo.pushedAt, "long", now)}</span>
      </span>
    </>
  );

  // Public repositories link out. Private ones are locked and not clickable.
  return repo.private || !repo.url ? (
    <li>
      <div className={cn(styles.repo, styles.priv)} title="Private repository">
        {body}
      </div>
    </li>
  ) : (
    <li>
      <a
        className={cn(styles.repo, styles.pub)}
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    </li>
  );
}

interface ReposWindowProps {
  /** Most recently pushed first. Null while loading. */
  repos: RepoSummary[] | null;
  /** The network failed and there is nothing to show. */
  unreachable?: boolean;
}

/** The right-hand glass window: "What I'm building", a scrollable repo list. */
export function ReposWindow({ repos, unreachable = false }: ReposWindowProps) {
  const now = useNow();
  return (
    <div className={cn("glass", styles.repos)} data-repos>
      <div className="wbar">
        <i />
        <i />
        <i />
        <div className="wbar-url">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
          </svg>
          github.com/thergishere-wp
        </div>
      </div>
      <div className={styles.head}>
        <p className="eyebrow">06 — Activity · Repositories</p>
        <h3>
          What I&apos;m <em>building.</em>
        </h3>
      </div>
      {/* data-lenis-prevent: this list scrolls on its own, not with the page. */}
      <ul
        className={styles.list}
        data-lenis-prevent
        aria-busy={repos === null && !unreachable}
      >
        {repos && repos.length > 0 ? (
          repos.map((repo) => <RepoRow key={repo.name} repo={repo} now={now} />)
        ) : repos || unreachable ? (
          <li className={styles.empty}>
            {unreachable
              ? "Couldn't reach GitHub right now."
              : "No repositories to show."}
          </li>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className={styles.skel} aria-hidden="true" />
          ))
        )}
      </ul>
    </div>
  );
}
