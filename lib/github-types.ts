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
  /** One level (0 to 3) per day for the last ~20 weeks, column by column. */
  levels: number[] | null;
  stale: boolean;
  error: boolean;
  fetchedAt: string;
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
