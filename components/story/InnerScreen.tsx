"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { projects, projectsAct } from "@/content/projects";
import { gsap } from "@/lib/gsap";
import type { FoldRig } from "@/lib/fold-rig";
import { FRAME_SANDBOX } from "../stage1/projects/frame";
import type { ScreenMetrics } from "../stage3/phone-geometry";
import styles from "./inner.module.css";

function LiveFrame({ url, title }: { url: string; title: string }) {
  // Hidden until loaded, so the screenshot underneath never flashes white.
  const [loaded, setLoaded] = useState(false);
  return (
    <iframe
      src={url}
      title={title}
      sandbox={FRAME_SANDBOX}
      referrerPolicy="no-referrer"
      tabIndex={-1}
      onLoad={() => setLoaded(true)}
      // Runtime value: the fade-in once the page has loaded.
      style={{ opacity: loaded ? 1 : 0 }}
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

/**
 * The live page over the open inner screen: tablet-sized iframes (only the
 * current and the next are mounted), the lock, and the click target that
 * opens the project full size. The screenshot textures underneath are drawn
 * by the model; this layer fades in over them. Steps drive the frames' and the
 * lock's opacity; the rig decides when the whole layer exists (open, flat).
 */
export function InnerScreen({ rig, metrics, current, near, onOpen }: InnerScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);

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
        root.style.visibility = open ? "visible" : "hidden";
      }
      root.querySelectorAll<HTMLElement>("[data-preview]").forEach((el, i) => {
        const value = String(Math.round((rig.frames[i] ?? 0) * 1000) / 1000);
        if (el.dataset.v === value) return;
        el.dataset.v = value;
        el.style.opacity = value;
        el.style.visibility = Number(value) <= 0.001 ? "hidden" : "visible";
      });
      const lock = root.querySelector<HTMLElement>("[data-lock]");
      if (lock) {
        const chip = String(Math.round(rig.chip * 1000) / 1000);
        if (lock.dataset.v !== chip) {
          lock.dataset.v = chip;
          lock.style.opacity = chip;
          lock.style.visibility = Number(chip) <= 0.001 ? "hidden" : "visible";
          lock.style.transform = `scale(${0.92 + 0.08 * rig.chip})`;
        }
      }
      // The shackle lifts first, then swings open.
      const shackle = root.querySelector<SVGElement>("[data-shackle]");
      if (shackle) {
        const lift = Math.min(1, rig.open / 0.4);
        const swing = Math.min(1, Math.max(0, (rig.open - 0.35) / 0.65));
        shackle.style.transformOrigin = "16px 11px";
        shackle.style.transform = `translateY(${-3.2 * lift}px) rotate(${-32 * swing}deg)`;
      }
    };
    apply();
    gsap.ticker.add(apply);
    return () => gsap.ticker.remove(apply);
  }, [rig]);

  const active = current >= 0 ? projects[current] : null;

  // Runtime layout values, all from the measured mesh.
  const size = {
    width: metrics.px.w,
    height: metrics.px.h,
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
        <div className={styles.chip}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#141414"
            strokeWidth="1.3"
            strokeLinecap="round"
          >
            <path data-shackle d="M8 11V7.5a4 4 0 0 1 8 0V11" />
            <rect x="5" y="11" width="14" height="10" rx="2.5" fill="rgba(255,255,255,.7)" />
            <circle cx="12" cy="15.4" r="1.2" fill="#141414" stroke="none" />
            <path d="M12 16.4v1.8" />
          </svg>
          <p>{projectsAct.lockedLabel}</p>
        </div>
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
      <span className={styles.hint}>{projectsAct.openHint}</span>
    </div>
  );
}
