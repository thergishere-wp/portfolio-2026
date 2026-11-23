"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLenis } from "@/lib/smooth-scroll";
import { LaunchingSoonCard } from "./LaunchingSoonCard";
import { FRAME_SANDBOX } from "./ProjectPreview";
import styles from "./ProjectViewer.module.css";

interface ProjectViewerProps {
  project: Project;
  /** The window's rect when it was clicked: where the expand starts. */
  from: DOMRect;
  /** The window, so closing can fly back to wherever it is now. */
  windowRef: RefObject<HTMLElement | null>;
  /** Called once the close animation has finished. */
  onClosed: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex="0"]';

/**
 * Click-to-expand viewer. FLIPs from the window's rect to 90vw x 90vh over a
 * blurred backdrop and shows the site as an interactive iframe. Scrolling is
 * paused while it is open; Esc, the backdrop or Close reverse the FLIP.
 */
export function ProjectViewer({
  project,
  from,
  windowRef,
  onClosed,
}: ProjectViewerProps) {
  const lenis = useLenis();
  const winRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  // Captured on the first render, before the open animation moves focus.
  const [opener] = useState(() => document.activeElement);

  // Pause smooth scroll while open, and hand focus back on the way out.
  useEffect(() => {
    lenis?.stop();
    return () => {
      lenis?.start();
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, [lenis, opener]);

  useGSAP(
    () => {
      const win = winRef.current;
      if (!win) return;
      const to = win.getBoundingClientRect();
      gsap.fromTo(
        win,
        {
          x: from.left - to.left,
          y: from.top - to.top,
          scaleX: from.width / to.width,
          scaleY: from.height / to.height,
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: "expo.out" },
      );
      gsap.fromTo(backRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      closeRef.current?.focus({ preventScroll: true });
    },
    { dependencies: [] },
  );

  // Plain tweens: they finish before the viewer unmounts (onComplete).
  const close = (): void => {
    const win = winRef.current;
    if (!win || closing.current) return;
    closing.current = true;
    const target = windowRef.current?.getBoundingClientRect() ?? from;
    const now = win.getBoundingClientRect();
    gsap.to(backRef.current, { opacity: 0, duration: 0.4 });
    gsap.to(win, {
      x: target.left - now.left,
      y: target.top - now.top,
      scaleX: target.width / now.width,
      scaleY: target.height / now.height,
      duration: 0.55,
      ease: "expo.inOut",
      onComplete: onClosed,
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab inside the dialog.
      const items = winRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const hasFooter = project.viewerNote !== null || Boolean(project.stats);

  return createPortal(
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} preview`}
    >
      <div ref={backRef} className={styles.back} onClick={close} />
      <div ref={winRef} className={cn("glass", styles.vwin)}>
        <div className="wbar">
          <i />
          <i />
          <i />
          <div className="wbar-url">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span>{project.domain}</span>
          </div>
          {project.liveUrl ? (
            <a
              className={styles.action}
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab ↗
            </a>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            className={styles.action}
            onClick={close}
          >
            Close (Esc)
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.stage}>
            {project.status === "soon" ? (
              <LaunchingSoonCard />
            ) : project.frameable && project.frameUrl ? (
              <iframe
                className={styles.frame}
                src={project.frameUrl}
                title={`${project.name} (interactive)`}
                sandbox={FRAME_SANDBOX}
                referrerPolicy="no-referrer"
              />
            ) : project.shot ? (
              <Image
                className={styles.shot}
                src={project.shot}
                alt={`${project.name} homepage`}
                fill
                sizes="90vw"
              />
            ) : null}
          </div>
          {hasFooter ? (
            <div className={styles.footer}>
              {project.viewerNote ? <span>{project.viewerNote}</span> : null}
              {project.stats?.map((stat) => (
                <span key={stat.label} className={styles.stat}>
                  <b>{stat.value}</b>
                  {stat.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
