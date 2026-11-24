"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { projects, projectsAct } from "@/content/projects";
import { INNER_PX, type FoldRig } from "@/lib/fold-rig";
import { gsap } from "@/lib/gsap";
import { useBangkokTime } from "@/lib/time";
import { FRAME_SANDBOX } from "../stage1/projects/frame";
import type { ScreenMetrics } from "../stage3/phone-geometry";
import styles from "./inner.module.css";

/**
 * The poster stays up for this long after the iframe's load event, then the
 * page fades in over it. The page keeps rendering (and playing its entrance
 * animation) the whole time, hidden by opacity only, so its hero has painted
 * by then.
 */
const SETTLE_MS = 900;

function LiveFrame({ url, title }: { url: string; title: string }) {
  // Hidden until the page has loaded AND settled, so the poster underneath is
  // never doubled by a half-rendered page.
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <iframe
      src={url}
      title={title}
      sandbox={FRAME_SANDBOX}
      referrerPolicy="no-referrer"
      tabIndex={-1}
      onLoad={() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setShown(true), SETTLE_MS);
      }}
      // Runtime value: the fade-in once the page has loaded and settled.
      style={{ opacity: shown ? 1 : 0 }}
    />
  );
}

interface InnerScreenProps {
  rig: FoldRig;
  /** The union of both inner screens as measured from the mesh. */
  metrics: ScreenMetrics;
  /** The project the story has unlocked (-1 while locked) and whether previews may load. */
  current: number;
  near: boolean;
  /** Called with the screen's on-screen rect (and the element) when it is clicked. */
  onOpen: (rect: DOMRect, element: HTMLElement) => void;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * The page over the open inner screen: ONE continuous plane across both halves
 * (a single iframe per project, laid out at INNER_PX, the same viewport the
 * poster screenshots are captured at), the lock screen, and the click target
 * that opens the project full size. The poster textures underneath are drawn by
 * the model; the live page fades in over them. The rig decides when the layer
 * exists (the halves lie flat and open).
 */
export function InnerScreen({ rig, metrics, current, near, onOpen }: InnerScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = useBangkokTime("short");
  const day = useBangkokTime("menubar");

  useEffect(() => {
    // The rig holds plain numbers (the steps tween them, whether or not this
    // DOM exists yet); this applies them to the DOM every tick.
    const apply = (): void => {
      const root = rootRef.current;
      if (!root) return;
      const open = rig.show > 0.99 && rig.unfold > 0.999 && rig.shut < 0.001;
      const key = open ? "1" : "0";
      if (root.dataset.on !== key) {
        root.dataset.on = key;
        root.style.opacity = key;
      }
      // Never visibility:hidden while the device exists: Chrome stops
      // rendering (and animating) a hidden cross-origin iframe, so a page
      // would start its entrance animation only when first shown and be
      // half-drawn on screen. Opacity hides it without that.
      const exists = rig.show > 0.5 ? "visible" : "hidden";
      if (root.style.visibility !== exists) root.style.visibility = exists;
      root.querySelectorAll<HTMLElement>("[data-preview]").forEach((el, i) => {
        const value = String(Math.round((rig.frames[i] ?? 0) * 1000) / 1000);
        if (el.dataset.v === value) return;
        el.dataset.v = value;
        el.style.opacity = value;
      });

      // The lock: the icon opens (the shackle lifts, then swings), then the
      // whole lock screen slides up like iOS, revealing the page.
      const lock = root.querySelector<HTMLElement>("[data-lock]");
      if (lock) {
        const slide = clamp01((rig.open - 0.4) / 0.6);
        const eased = slide * slide * (3 - 2 * slide);
        const value = String(Math.round(eased * 1000) / 1000);
        if (lock.dataset.v !== value) {
          lock.dataset.v = value;
          lock.style.transform = `translateY(${-100 * eased}%)`;
          lock.style.visibility = eased >= 0.999 ? "hidden" : "visible";
        }
      }
      const shackle = root.querySelector<SVGElement>("[data-shackle]");
      if (shackle) {
        const lift = clamp01(rig.open / 0.25);
        const swing = clamp01((rig.open - 0.2) / 0.2);
        shackle.style.transformOrigin = "16px 11px";
        shackle.style.transform = `translateY(${-3.2 * lift}px) rotate(${-32 * swing}deg)`;
      }
    };
    apply();
    gsap.ticker.add(apply);
    return () => gsap.ticker.remove(apply);
  }, [rig]);

  const active = current >= 0 ? projects[current] : null;
  const wallpaper = projects[0].shot ? `/shots/${projects[0].id}-fold.jpg` : undefined;
  const date = day ? day.split(" ").slice(0, 3).join(" ") : "";

  // The page is laid out at exactly the poster's viewport; only the corner
  // radius comes from the measured mesh.
  const size = {
    width: INNER_PX.w,
    height: INNER_PX.h,
    "--ir": `${metrics.px.r}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={styles.inner} style={size} data-inner>
      {projects.map((project, i) => (
        <div key={project.id} className={styles.frame} data-preview data-project={project.id}>
          {near &&
          (i === current || i === current + 1) &&
          project.frameable &&
          project.frameUrl ? (
            <LiveFrame url={project.frameUrl} title={`${project.name} homepage`} />
          ) : null}
        </div>
      ))}
      <div className={styles.crease} aria-hidden="true" />
      <div className={styles.lock} data-lock aria-hidden="true">
        <div
          className={styles.wall}
          // Runtime value: the first project's own page, blurred, is the wallpaper.
          style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
        />
        <svg
          className={styles.lockIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path data-shackle d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          <rect x="5" y="11" width="14" height="10" rx="2.5" />
        </svg>
        <p className={styles.date}>{date}</p>
        <p className={styles.time}>{clock ?? "--:--"}</p>
        <p className={styles.city}>Bangkok</p>
        <p className={styles.hint}>{projectsAct.lockedLabel}</p>
      </div>
      <button
        type="button"
        className={styles.hit}
        data-on={active ? "true" : "false"}
        data-cursor={active ? "open" : undefined}
        tabIndex={active ? 0 : -1}
        aria-label={active ? `Open ${active.name} preview` : "Project preview, locked"}
        onClick={(event) =>
          onOpen(event.currentTarget.getBoundingClientRect(), event.currentTarget)
        }
      />
      <span className={styles.hint2}>{projectsAct.openHint}</span>
    </div>
  );
}
