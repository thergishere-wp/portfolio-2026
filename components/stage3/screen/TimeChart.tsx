"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {
  WEEKDAYS,
  hourLabel,
  peakIndex,
  type ActivityStats,
} from "@/lib/activity-stats";
import { cn } from "@/lib/cn";
import styles from "./summary.module.css";

type Range = "day" | "week";

/** Minimum chart height in commits, so one commit is not a full-height bar. */
const MIN_SCALE = 3;
/** Day-axis ticks: hour and label. */
const DAY_TICKS = [
  [0, "12a"],
  [6, "6a"],
  [12, "12p"],
  [18, "6p"],
] as const;

const plural = (n: number): string => (n === 1 ? "commit" : "commits");

/**
 * "Coding time", in the style of Screen Time: grey bars with the peak in
 * violet, a dotted average line, a Day | Week toggle (commits per hour today,
 * or per day over the last 7 days, Bangkok time) and a "Most active" caption.
 * Tap a bar to see its count; Arrow keys move between bars.
 */
export function TimeChart({
  stats,
  viewed,
}: {
  stats: ActivityStats;
  viewed: boolean;
}) {
  const [range, setRange] = useState<Range>("day");
  const [selected, setSelected] = useState<number | null>(null);
  const [rover, setRover] = useState<number | null>(null);
  const bars = useRef<Array<HTMLButtonElement | null>>([]);

  const values =
    range === "day" ? stats.hours : stats.week.map((day) => day.count);
  const total = values.reduce((sum, v) => sum + v, 0);
  const peak = peakIndex(values);
  const average = total / values.length;
  const scale = Math.max(...values, MIN_SCALE);

  const nameOf = (i: number): string =>
    range === "day"
      ? hourLabel(i)
      : stats.week[i].isToday
        ? "Today"
        : WEEKDAYS[stats.week[i].weekday];

  const switchTo = (next: Range): void => {
    setRange(next);
    setSelected(null);
    setRover(null);
  };

  const tabStop = rover ?? peak ?? (range === "day" ? stats.hourNow : 6);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number): void => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = Math.min(values.length - 1, Math.max(0, i + step));
    setRover(next);
    bars.current[next]?.focus();
  };

  const headCount = selected === null ? total : values[selected];
  const headLabel =
    selected === null
      ? range === "day"
        ? "Today"
        : "Last 7 days"
      : nameOf(selected);

  return (
    <section className={styles.card} aria-labelledby="coding-time-title">
      <div className={styles.chartHead}>
        <div>
          <h3 id="coding-time-title" className={styles.cardTitle}>
            Coding time
          </h3>
          <p className={styles.bigNumber} aria-live="polite">
            <b>{headCount}</b> {plural(headCount)}
            <span>{headLabel}</span>
          </p>
        </div>
        <div className={styles.toggle} role="group" aria-label="Chart range">
          {(["day", "week"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              className={cn(range === option && styles.toggleOn)}
              onClick={() => switchTo(option)}
            >
              {option === "day" ? "Day" : "Week"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.plot}>
        {total > 0 ? (
          <div
            className={styles.avg}
            // Position follows the data: a runtime value.
            style={{ bottom: `${(average / scale) * 100}%` }}
            aria-hidden="true"
          >
            <span>avg</span>
          </div>
        ) : null}
        <div
          className={cn(styles.bars, range === "week" && styles.barsWeek)}
          role="group"
          aria-label={
            range === "day"
              ? "Commits per hour today"
              : "Commits per day over the last 7 days"
          }
        >
          {values.map((value, i) => (
            <button
              key={`${range}-${i}`}
              ref={(el) => {
                bars.current[i] = el;
              }}
              type="button"
              tabIndex={i === tabStop ? 0 : -1}
              aria-label={`${nameOf(i)}: ${value} ${plural(value)}`}
              aria-pressed={selected === i}
              className={cn(
                styles.bar,
                i === peak && styles.barPeak,
                selected === i && styles.barSelected,
                range === "day" && i > stats.hourNow && styles.barFuture,
              )}
              onClick={() => setSelected(selected === i ? null : i)}
              onFocus={() => setRover(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <i
                style={{
                  height: viewed ? `${(value / scale) * 100}%` : "0%",
                  transitionDelay: `${i * (range === "day" ? 16 : 60)}ms`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.axis} aria-hidden="true">
        {range === "day"
          ? DAY_TICKS.map(([hour, label]) => (
              <span
                key={hour}
                className={styles.tick}
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                {label}
              </span>
            ))
          : stats.week.map((day, i) => (
              <span
                key={i}
                className={cn(styles.weekTick, day.isToday && styles.weekToday)}
              >
                {WEEKDAYS[day.weekday][0]}
              </span>
            ))}
      </div>

      <p className={styles.caption}>
        {peak !== null
          ? `Most active · ${
              range === "day"
                ? hourLabel(peak)
                : stats.week[peak].isToday
                  ? "today"
                  : WEEKDAYS[stats.week[peak].weekday]
            }`
          : range === "day"
            ? "No commits yet today"
            : "No commits in the last 7 days"}
      </p>
    </section>
  );
}
