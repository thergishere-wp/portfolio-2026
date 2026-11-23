import { GOALS, type ActivityStats } from "@/lib/activity-stats";
import { cn } from "@/lib/cn";
import styles from "./summary.module.css";

interface Ring {
  key: "commits" | "days" | "repos";
  value: number;
  goal: number;
  label: string;
  /** Radius in the 100 x 100 viewBox. */
  radius: number;
}

const STROKE = 8;

/**
 * Three concentric progress rings, like Apple's Activity rings in violet and
 * its tints: commits today, active days this week, repositories this week.
 * They draw in once the screen has been seen (`viewed`).
 */
export function ActivityRings({
  stats,
  viewed,
}: {
  stats: ActivityStats;
  viewed: boolean;
}) {
  const rings: Ring[] = [
    {
      key: "commits",
      value: stats.today,
      goal: GOALS.commitsToday,
      label: "Commits today",
      radius: 44,
    },
    {
      key: "days",
      value: stats.activeDays,
      goal: GOALS.activeDays,
      label: "Active days this week",
      radius: 33,
    },
    {
      key: "repos",
      value: stats.reposTouched,
      goal: GOALS.repos,
      label: "Repos this week",
      radius: 22,
    },
  ];

  return (
    <section className={styles.rings} aria-label="Today at a glance">
      <svg viewBox="0 0 100 100" className={styles.ringSvg} aria-hidden="true">
        {rings.map((ring, i) => {
          const circumference = 2 * Math.PI * ring.radius;
          const progress = Math.min(1, ring.value / ring.goal);
          const offset = viewed ? circumference * (1 - progress) : circumference;
          return (
            <g key={ring.key} className={styles[`ring_${ring.key}`]}>
              <circle
                className={styles.ringTrack}
                cx="50"
                cy="50"
                r={ring.radius}
                strokeWidth={STROKE}
              />
              <circle
                className={styles.ringArc}
                cx="50"
                cy="50"
                r={ring.radius}
                strokeWidth={STROKE}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                // Zero progress draws nothing, not a dot from the round cap.
                opacity={progress === 0 ? 0 : 1}
                style={{ transitionDelay: `${i * 140}ms` }}
              />
            </g>
          );
        })}
      </svg>
      <dl className={styles.ringStats}>
        {rings.map((ring) => (
          <div key={ring.key} className={cn(styles.ringStat, styles[`ring_${ring.key}`])}>
            <dt>{ring.label}</dt>
            <dd>
              <b>{ring.value}</b>
              <span>/{ring.goal}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
