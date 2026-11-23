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
