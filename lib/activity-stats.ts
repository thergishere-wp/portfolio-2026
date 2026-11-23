import type { CommitStamp } from "@/lib/github-types";

/**
 * Everything the Summary screen shows, counted from real commit timestamps.
 * Days and hours are Asia/Bangkok wall-clock. Bangkok is UTC+7 all year with
 * no daylight saving, so a fixed offset is exact.
 */
const BANGKOK_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Goals the rings measure against. */
export const GOALS = { commitsToday: 8, activeDays: 7, repos: 5 } as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface RepoTotal {
  repo: string;
  private: boolean;
  count: number;
}

export interface DayTotal {
  count: number;
  /** 0 = Sunday, in Bangkok time. */
  weekday: number;
  isToday: boolean;
}

export interface ActivityStats {
  /** Commits made today (Bangkok). */
  today: number;
  /** Commits per hour today, 24 entries. */
  hours: number[];
  /** The current hour in Bangkok (0 to 23). */
  hourNow: number;
  /** Commits per day over the last 7 days, oldest first, today last. */
  week: DayTotal[];
  /** Days of the last 7 with at least one commit. */
  activeDays: number;
  /** Distinct repositories touched in the last 7 days. */
  reposTouched: number;
  /** The most committed-to repositories of the last 7 days. */
  topRepos: RepoTotal[];
}

/** A day number in Bangkok time: whole days since 1970-01-01 there. */
const dayOf = (ms: number): number => Math.floor((ms + BANGKOK_OFFSET_MS) / DAY_MS);
const hourOf = (ms: number): number =>
  new Date(ms + BANGKOK_OFFSET_MS).getUTCHours();

export function computeStats(
  commits: readonly CommitStamp[],
  now: number,
  topCount = 4,
): ActivityStats {
  const todayDay = dayOf(now);
  const hours = Array.from({ length: 24 }, () => 0);
  const perDay = Array.from({ length: 7 }, () => 0);
  const perRepo = new Map<string, RepoTotal>();

  for (const commit of commits) {
    const ms = new Date(commit.at).getTime();
    const age = todayDay - dayOf(ms);
    // Ignore the future (clock skew) and anything older than 7 days.
    if (age < 0 || age > 6) continue;

    perDay[6 - age] += 1;
    if (age === 0) hours[hourOf(ms)] += 1;

    const total = perRepo.get(commit.repo) ?? {
      repo: commit.repo,
      private: commit.private,
      count: 0,
    };
    total.count += 1;
    perRepo.set(commit.repo, total);
  }

  const week = perDay.map((count, i) => ({
    count,
    weekday: new Date((todayDay - (6 - i)) * DAY_MS).getUTCDay(),
    isToday: i === 6,
  }));

  return {
    today: perDay[6],
    hours,
    hourNow: hourOf(now),
    week,
    activeDays: perDay.filter((count) => count > 0).length,
    reposTouched: perRepo.size,
    topRepos: [...perRepo.values()]
      .sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo))
      .slice(0, topCount),
  };
}

/** Index of the largest value, or null when everything is zero. First wins ties. */
export function peakIndex(values: readonly number[]): number | null {
  let best: number | null = null;
  values.forEach((value, i) => {
    if (value > 0 && (best === null || value > values[best])) best = i;
  });
  return best;
}

/** 0 -> "12 am", 18 -> "6 pm". */
export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? "am" : "pm"}`;
}

/** "portfolio-2026" -> "P2", "lanka-n-beyond" -> "LN", "teamflow" -> "TE". */
export function repoInitials(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? name).slice(0, 2).toUpperCase();
}
