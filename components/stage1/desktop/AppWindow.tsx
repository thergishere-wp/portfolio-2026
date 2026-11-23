"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLenis } from "@/lib/smooth-scroll";
import panelStyles from "../about/panels.module.css";
import styles from "./desktop.module.css";

interface AppWindowProps {
  title: string;
  /** The dock icon's rect: the window scales up from, and back to, it. */
  origin: DOMRect;
  /** Called once the close animation has finished. */
  onClosed: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Offset (px) from the window's centre to the icon's centre. */
function offsetFrom(win: HTMLElement, origin: DOMRect): { x: number; y: number } {
  const rect = win.getBoundingClientRect();
  return {
    x: origin.left + origin.width / 2 - (rect.left + rect.width / 2),
    y: origin.top + origin.height / 2 - (rect.top + rect.height / 2),
  };
}

/**
 * An app window on the About desktop: a dialog with traffic lights, a title
 * bar and a scrollable body. It scales up from its dock icon, traps focus,
 * closes with the red light or Esc, and pauses smooth scroll while open.
 */
export function AppWindow({
  title,
  origin,
  onClosed,
  children,
}: AppWindowProps) {
  const lenis = useLenis();
  const titleId = useId();
  const winRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    lenis?.stop();
    return () => lenis?.start();
  }, [lenis]);

  useGSAP(
    () => {
      const win = winRef.current;
      if (!win) return;
      gsap.fromTo(
        win,
        { ...offsetFrom(win, origin), scale: 0.1, opacity: 0 },
        { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.55, ease: "expo.out" },
      );
      closeRef.current?.focus({ preventScroll: true });
    },
    { dependencies: [] },
  );

  const close = (): void => {
    const win = winRef.current;
    if (!win || closing.current) return;
    closing.current = true;
    gsap.to(win, {
      ...offsetFrom(win, origin),
      scale: 0.1,
      opacity: 0,
      duration: 0.35,
      ease: "power3.in",
      onComplete: onClosed,
    });
  };

  // Esc closes, and Tab stays inside the dialog.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = winRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!winRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div
      ref={winRef}
      className={cn("mwin", styles.appWin)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={cn("mwin-bar", styles.bar)}>
        <button
          ref={closeRef}
          type="button"
          className={styles.light}
          aria-label={`Close ${title}`}
          onClick={close}
        />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <span id={titleId} className="mwin-title">
          {title}
        </span>
      </div>
      <div className={cn(styles.body, panelStyles.inWin)} data-lenis-prevent>
        {children}
      </div>
    </div>
  );
}
