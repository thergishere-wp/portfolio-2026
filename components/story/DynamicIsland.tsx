"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { gsap } from "@/lib/gsap";
import type { FoldRig } from "@/lib/fold-rig";
import { useGithub } from "@/lib/github-store";
import { useIslandHover } from "@/lib/island-store";
import { formatRelative, useBangkokTime, useNow } from "@/lib/time";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import styles from "./island.module.css";

type Mode = "idle" | "push" | "last" | "available" | "handle";

/**
 * Target size of each mode in em: [length along the top edge, thickness]. The
 * island is part of the device, so it turns with it: in landscape the phone's
 * top edge is a short edge of the view (its right side), and the pill lies
 * ALONG that edge and grows along it, never into the content.
 */
const SIZE: Record<Mode, readonly [number, number]> = {
  idle: [8.2, 2.4],
  push: [21, 3.4],
  last: [21.5, 3],
  available: [13.6, 2.4],
  handle: [17, 2.4],
};

/** How long a push (or a tap) keeps the island open. */
const OPEN_MS = 4000;

interface PushEvent {
  repo: string;
  isPrivate: boolean;
  /** Commits that arrived in this update. */
  added: number;
}

/** "kaiflo" -> "KA", "lanka-n-beyond" -> "LN". */
function initials(repo: string): string {
  const parts = repo.split(/[-_.]/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : repo.slice(0, 2);
  return letters.toUpperCase();
}

const LockSvg = ({ className }: { className: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
  </svg>
);

/**
 * The Dynamic Island, drawn inside the clipped cover screen: live status.
 *  - idle: a small pill with a green pulse
 *  - a new real push (the 60 s poll): it springs open to show the repo icon
 *    and "kaiflo · +3 commits" for about 4 s, then collapses. Private repos
 *    show the name only, never a message.
 *  - a tap: "Last push 6m ago · Bangkok 21:33"
 *  - on Contact (landscape): "Available for projects"; hovering a social
 *    icon morphs it to that handle
 * With prefers-reduced-motion there is no spring: the size changes at once and
 * the text cross-fades.
 */
export function DynamicIsland({ rig }: { rig: Pick<FoldRig, "rz"> }) {
  const reduced = usePrefersReducedMotion();
  const { activity } = useGithub();
  const hover = useIslandHover();
  const now = useNow();
  const clock = useBangkokTime("short");
  const pillRef = useRef<HTMLButtonElement>(null);
  const previousArea = useRef(0);
  const [landscape, setLandscape] = useState(false);
  const [event, setEvent] = useState<PushEvent | null>(null);
  const [tapped, setTapped] = useState(false);

  // Landscape follows the phone's ACTUAL rotation (more than 45 degrees), so
  // going back up from Contact can never leave a landscape island on an
  // upright phone.
  useEffect(() => {
    let last = false;
    const check = (): void => {
      const next = Math.abs(rig.rz) > Math.PI / 4;
      if (next === last) return;
      last = next;
      setLandscape(next);
    };
    check();
    gsap.ticker.add(check);
    return () => gsap.ticker.remove(check);
  }, [rig]);

  // A new push: compare the newest group with the one seen last. The first
  // load only sets the baseline, so the island never announces old pushes.
  const top = activity?.pushes[0] ?? null;
  const seen = useRef<{ repo: string; at: string; count: number } | null | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!activity) return;
    const previous = seen.current;
    seen.current = top ? { repo: top.repo, at: top.at, count: top.count } : null;
    if (previous === undefined || !top) return;
    if (previous && previous.repo === top.repo && previous.at === top.at) return;
    const added =
      previous && previous.repo === top.repo
        ? Math.max(1, top.count - previous.count)
        : top.count;
    // Asynchronous on purpose: this is a reaction to polled data, not a render.
    const show = window.setTimeout(
      () => setEvent({ repo: top.repo, isPrivate: top.private, added }),
      0,
    );
    const hide = window.setTimeout(() => setEvent(null), OPEN_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [activity, top]);

  // A tap opens "Last push..." for a few seconds.
  useEffect(() => {
    if (!tapped) return;
    const id = window.setTimeout(() => setTapped(false), OPEN_MS);
    return () => window.clearTimeout(id);
  }, [tapped]);

  const mode: Mode = landscape
    ? hover
      ? "handle"
      : "available"
    : event
      ? "push"
      : tapped
        ? "last"
        : "idle";
  const [length, thickness] = SIZE[mode];

  // The pill springs open (overshoot) and eases shut; no spring when reduced.
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const [w, h] = [length, thickness];
    const area = length * thickness;
    const grows = area > previousArea.current;
    previousArea.current = area;
    gsap.to(el, {
      width: `${w}em`,
      height: `${h}em`,
      borderRadius: `${Math.min(w, h) / 2}em`,
      duration: reduced ? 0 : grows ? 0.85 : 0.45,
      ease: grows ? "back.out(2.2)" : "power3.inOut",
      overwrite: "auto",
    });
  }, [mode, landscape, length, thickness, reduced]);

  const relative = top ? formatRelative(top.at, "short", now) : null;
  const lastText = !top
    ? "No pushes yet"
    : `Last push ${relative === "now" ? "just now" : `${relative} ago`}${clock ? ` · Bangkok ${clock}` : ""}`;
  const pushText = event
    ? event.isPrivate
      ? event.repo
      : `${event.repo} · +${event.added} commit${event.added === 1 ? "" : "s"}`
    : "";
  const spoken =
    mode === "push" && event
      ? event.isPrivate
        ? `New push to a private repository, ${event.repo}`
        : `New push: ${pushText}`
      : "";

  // Runtime layout values: the content box matches the target size.
  const box = {
    width: `${length}em`,
    height: `${thickness}em`,
    transform: "translate(-50%, -50%)",
  } as CSSProperties;

  return (
    <>
      <button
        ref={pillRef}
        type="button"
        className={styles.pill}
        aria-label="Live status"
        onClick={() => {
          if (!landscape) setTapped((open) => !open);
        }}
      >
        <span className={styles.box} style={box}>
          <span className={styles.slot} data-on={mode === "idle"}>
            <i className={styles.dot} />
          </span>
          <span className={styles.slot} data-on={mode === "push"}>
            {event?.isPrivate ? (
              <LockSvg className={styles.lockIcon} />
            ) : (
              <i className={styles.repoIcon}>{event ? initials(event.repo) : ""}</i>
            )}
            <span>{pushText}</span>
          </span>
          <span className={styles.slot} data-on={mode === "last"}>
            <span>{lastText}</span>
          </span>
          <span className={styles.slot} data-on={mode === "available"}>
            <i className={styles.dot} />
            <span>Available for projects</span>
          </span>
          <span className={styles.slot} data-on={mode === "handle"}>
            <span>{hover ?? ""}</span>
          </span>
        </span>
      </button>
      <span className={styles.sr} role="status" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}
