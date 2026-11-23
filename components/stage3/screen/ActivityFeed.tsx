import type { PushGroup } from "@/lib/github-types";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/time";
import styles from "./screen.module.css";

const COMMIT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M3 12h5.5M15.5 12H21" />
  </svg>
);

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

interface ActivityFeedProps {
  /** Newest first. Null while there is nothing to show yet. */
  items: PushGroup[] | null;
  /** Left side of the header, e.g. "Live · last push 6m ago". */
  headline?: string;
  live?: boolean;
}

/**
 * Real pushes, newest first. Private repositories show a lock, the repo name
 * and "N commits · private repository", never a message. With no data it
 * shows an honest empty state, not placeholder rows pretending to be commits.
 */
export function ActivityFeed({ items, headline, live = false }: ActivityFeedProps) {
  return (
    <>
      <div className={styles.feedhead}>
        <span className={cn(styles.feedStatus, live && styles.live)}>
          {headline ?? "Recent pushes"}
        </span>
        <span>last 14 days</span>
      </div>
      {items ? (
        <ul className={styles.feed}>
          {items.map((item) => (
            <li key={`${item.repo}-${item.at}`}>
              <span className={styles.feedIcon}>
                {item.private ? LOCK_ICON : COMMIT_ICON}
              </span>
              <span className={styles.msg}>
                <b>{item.repo}</b>
                <span>
                  {item.private
                    ? `${item.count} ${item.count === 1 ? "commit" : "commits"} · private repository`
                    : (item.message ?? "")}
                </span>
              </span>
              <time dateTime={item.at}>{formatRelative(item.at, "short")}</time>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className={cn(styles.feed, styles.skel)} aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} />
            ))}
          </ul>
          <p className={styles.note}>Recent pushes will appear here.</p>
        </>
      )}
    </>
  );
}
