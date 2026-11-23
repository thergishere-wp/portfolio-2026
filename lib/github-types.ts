/**
 * Shapes of the GitHub data the UI renders. The server route handlers (the
 * next phase) produce these; private repositories arrive already stripped.
 */

export interface RepoSummary {
  name: string;
  private: boolean;
  /** Null for private repositories unless explicitly allow-listed. */
  description: string | null;
  language: string | null;
  languageColor: string | null;
  /** ISO timestamp of the last push. */
  pushedAt: string;
  /** Null for private repositories: they are never linked. */
  url: string | null;
}

/** What GET /api/github/repos returns. */
export interface ReposPayload {
  /** False when no GitHub token is set: there is simply nothing to show. */
  configured: boolean;
  repos: RepoSummary[];
  /** True when GitHub failed and this is the last good data. */
  stale: boolean;
  /** True when GitHub failed and there is no last good data. */
  error: boolean;
  fetchedAt: string;
}

/** What GET /api/github/activity returns. */
export interface ActivityPayload {
  configured: boolean;
  /** Push groups, newest first. */
  pushes: PushGroup[];
  /**
   * One entry per commit of the last 14 days, newest first. Timestamps only:
   * the Summary screen counts them (per hour, per day, per repository).
   */
  commits: CommitStamp[];
  stale: boolean;
  error: boolean;
  fetchedAt: string;
}

/**
 * A commit reduced to when and where. It carries no message and no URL, so it
 * is safe for private repositories (the repository name is already shown).
 */
export interface CommitStamp {
  repo: string;
  private: boolean;
  /** ISO timestamp (UTC) of the commit. */
  at: string;
}

export interface PushGroup {
  repo: string;
  private: boolean;
  /** Commits in this push group. */
  count: number;
  /** Null for private repositories, stripped on the server. */
  message: string | null;
  url: string | null;
  /** ISO timestamp of the newest commit in the group. */
  at: string;
}
