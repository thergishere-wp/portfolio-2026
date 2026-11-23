import "server-only";
import { privateRepoAllowList } from "@/content/projects";
import type {
  ActivityPayload,
  PushGroup,
  RepoSummary,
  ReposPayload,
} from "@/lib/github-types";

/**
 * GitHub data for the phone and the repositories window. Server only: the
 * token never reaches the client, and everything about a private repository
 * (messages, URLs, descriptions) is stripped here, before it leaves the server.
 */

const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
const USER = process.env.GITHUB_USER ?? "thergishere-wp";

const RECENT_REPOS = 12;
const WINDOW_DAYS = 14;
const GROUP_GAP_MS = 30 * 60_000;
const CALENDAR_WEEKS = 20;
const MAX_PUSHES = 30;

/** Linguist colours for the languages likely to show up. */
const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  PHP: "#4F5D95",
  HTML: "#E34C26",
  CSS: "#663399",
  Python: "#3572A5",
  Shell: "#89E051",
  "C#": "#178600",
  Java: "#B07219",
  Go: "#00ADD8",
  Rust: "#DEA584",
  Dart: "#00B4AB",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PLpgSQL: "#336790",
  SCSS: "#C6538C",
};

interface GhRepo {
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  pushed_at: string | null;
  updated_at: string;
  html_url: string;
  owner: { login: string };
}

interface GhCommit {
  html_url: string;
  commit: {
    message: string;
    author: { date: string } | null;
    committer: { date: string } | null;
  };
}

interface GhCalendar {
  data?: {
    viewer?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks: Array<{
            contributionDays: Array<{ date: string; contributionCount: number }>;
          }>;
        };
      };
    };
  };
  errors?: unknown;
}

export function isConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

async function gh<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "portfolio-2026",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  // 409: an empty repository has no commits. That is not an error.
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

function toRepoSummary(r: GhRepo): RepoSummary {
  return {
    name: r.name,
    private: r.private,
    // Private repos never expose a description unless allow-listed.
    description: r.private
      ? (privateRepoAllowList[r.name] ?? null)
      : r.description,
    language: r.language,
    languageColor: r.language ? (LANGUAGE_COLORS[r.language] ?? null) : null,
    pushedAt: r.pushed_at ?? r.updated_at,
    // Private repos are never linked.
    url: r.private ? null : r.html_url,
  };
}

async function listRepos(): Promise<GhRepo[]> {
  const repos = await gh<GhRepo[]>(
    "/user/repos?affiliation=owner&sort=pushed&per_page=50",
  );
  return repos ?? [];
}

const timeOf = (c: GhCommit): number =>
  new Date(c.commit.committer?.date ?? c.commit.author?.date ?? 0).getTime();

const firstLine = (message: string): string => message.split("\n")[0].trim();

/** Same repo, commits within 30 minutes of each other: one push group. */
function groupPushes(repo: GhRepo, commits: GhCommit[]): PushGroup[] {
  const sorted = [...commits].sort((a, b) => timeOf(b) - timeOf(a));
  const groups: GhCommit[][] = [];
  for (const commit of sorted) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    if (group && previous && timeOf(previous) - timeOf(commit) <= GROUP_GAP_MS) {
      group.push(commit);
    } else {
      groups.push([commit]);
    }
  }
  return groups.map((group) => {
    const head = group[0];
    return {
      repo: repo.name,
      private: repo.private,
      count: group.length,
      // Stripped on the server for private repositories.
      message: repo.private ? null : firstLine(head.commit.message),
      url: repo.private ? null : head.html_url,
      at: new Date(timeOf(head)).toISOString(),
    };
  });
}

/** Midnight UTC, 14 days ago: stable for a day, so the upstream URL caches. */
function sinceIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS);
  return d.toISOString();
}

async function loadPushes(repos: GhRepo[]): Promise<PushGroup[]> {
  const recent = repos.slice(0, RECENT_REPOS);
  const since = sinceIso();
  let failures = 0;

  const perRepo = await Promise.all(
    recent.map(async (repo) => {
      try {
        const commits = await gh<GhCommit[]>(
          `/repos/${repo.owner.login}/${repo.name}/commits?author=${encodeURIComponent(USER)}&since=${since}&per_page=20`,
        );
        return groupPushes(repo, commits ?? []);
      } catch {
        failures += 1;
        return [];
      }
    }),
  );

  // One bad repo is skipped. If every repo failed, GitHub is the problem.
  if (recent.length > 0 && failures === recent.length) {
    throw new Error("GitHub commits failed for every repository");
  }
  return perRepo
    .flat()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_PUSHES);
}

/** Last ~20 weeks of the contribution calendar as one 0-3 level per day. */
async function loadLevels(): Promise<number[] | null> {
  const body = await gh<GhCalendar>("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "query { viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }",
    }),
  });
  const weeks =
    body?.data?.viewer?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) return null;

  const counts = weeks.slice(-CALENDAR_WEEKS).flatMap((week) => {
    const days = week.contributionDays.map((d) => d.contributionCount);
    // The current week is partial: pad it to a full column.
    while (days.length < 7) days.push(0);
    return days;
  });
  const max = Math.max(...counts, 1);
  return counts.map((count) => {
    if (count === 0) return 0;
    const ratio = count / max;
    return ratio <= 0.25 ? 1 : ratio <= 0.6 ? 2 : 3;
  });
}

async function loadRepos(): Promise<ReposPayload> {
  const repos = (await listRepos()).map(toRepoSummary);
  return {
    configured: true,
    repos,
    stale: false,
    error: false,
    fetchedAt: new Date().toISOString(),
  };
}

async function loadActivity(): Promise<ActivityPayload> {
  const repos = await listRepos();
  // The calendar is nice to have; a failure there must not hide the pushes.
  const [pushes, levels] = await Promise.all([
    loadPushes(repos),
    loadLevels().catch(() => null),
  ]);
  return {
    configured: true,
    pushes,
    levels,
    stale: false,
    error: false,
    fetchedAt: new Date().toISOString(),
  };
}

const TTL_MS = 60_000;
/** After a failure, wait this long before asking GitHub again. */
const RETRY_MS = 15_000;

/**
 * A 60-second cache that remembers the last good value. (BUILD_SPEC.md says
 * fetch(..., { next: { revalidate: 60 } }); this does the same job and, unlike
 * the framework cache, lets a failed refresh return the last good data flagged
 * stale.) Concurrent callers share one in-flight request.
 */
function cachedLoader<T extends { stale: boolean }>(
  name: string,
  load: () => Promise<T>,
  whenFailed: () => T,
): () => Promise<T> {
  let last: { data: T; at: number } | null = null;
  let failedAt = 0;
  let inflight: Promise<T> | null = null;

  return async () => {
    const now = Date.now();
    if (last && now - last.at < TTL_MS) return last.data;
    if (last && now - failedAt < RETRY_MS) return { ...last.data, stale: true };

    inflight ??= load()
      .then((data) => {
        last = { data, at: Date.now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });

    try {
      return await inflight;
    } catch (error) {
      failedAt = Date.now();
      console.error(`[github] ${name} failed:`, error instanceof Error ? error.message : error);
      return last ? { ...last.data, stale: true } : whenFailed();
    }
  };
}

const loadReposCached = cachedLoader("repos", loadRepos, () => ({
  configured: true,
  repos: [],
  stale: true,
  error: true,
  fetchedAt: new Date().toISOString(),
}));

const loadActivityCached = cachedLoader("activity", loadActivity, () => ({
  configured: true,
  pushes: [],
  levels: null,
  stale: true,
  error: true,
  fetchedAt: new Date().toISOString(),
}));

/**
 * Without a token there is nothing to show, and we say so: the UI renders an
 * empty state, never fake rows. On a GitHub error, serve the last good data
 * flagged stale (the UI then reads "Live · reconnecting").
 */
export async function getRepos(): Promise<ReposPayload> {
  if (!isConfigured()) {
    return {
      configured: false,
      repos: [],
      stale: false,
      error: false,
      fetchedAt: new Date().toISOString(),
    };
  }
  return loadReposCached();
}

export async function getActivity(): Promise<ActivityPayload> {
  if (!isConfigured()) {
    return {
      configured: false,
      pushes: [],
      levels: null,
      stale: false,
      error: false,
      fetchedAt: new Date().toISOString(),
    };
  }
  return loadActivityCached();
}
