"use client";

import { useRef, useState, type ReactNode } from "react";
import { dock, type AppId } from "@/content/about";
import { AboutPanel } from "../about/AboutPanel";
import { EducationPanel } from "../about/EducationPanel";
import { JourneyPanel } from "../about/JourneyPanel";
import { NowPanel } from "../about/NowPanel";
import { ToolkitPanel } from "../about/ToolkitPanel";
import { AppWindow } from "./AppWindow";
import { Dock } from "./Dock";
import { ResumeApp } from "./ResumeApp";
import styles from "./desktop.module.css";

const APPS: Record<AppId, ReactNode> = {
  edu: <EducationPanel />,
  jour: <JourneyPanel />,
  now: <NowPanel />,
  kit: <ToolkitPanel />,
  cv: <ResumeApp />,
};

interface OpenApp {
  id: AppId;
  origin: DOMRect;
}

/**
 * The macOS-style desktop inside the iMac screen: the About window is open by
 * default, a dock opens one app window at a time over it. The scroll timeline
 * fades the whole desktop (data-desktop) in and out.
 */
export function Desktop() {
  const [open, setOpen] = useState<OpenApp | null>(null);
  const [hint, setHint] = useState(true);
  const buttons = useRef<Partial<Record<AppId, HTMLButtonElement | null>>>({});
  const openId = useRef<AppId | null>(null);

  const register = (id: AppId, button: HTMLButtonElement | null): void => {
    buttons.current[id] = button;
  };

  const onOpen = (id: AppId, button: HTMLButtonElement): void => {
    setHint(false);
    openId.current = id;
    setOpen({ id, origin: button.getBoundingClientRect() });
  };

  // Hand focus back to the icon once its window has gone. A window that was
  // replaced by another app finishes closing too, and must do nothing.
  const onClosed = (id: AppId): void => {
    if (openId.current !== id) return;
    openId.current = null;
    setOpen(null);
    buttons.current[id]?.focus({ preventScroll: true });
  };

  const current = open ? dock.items.find((item) => item.id === open.id) : null;

  return (
    <div className={styles.desktop} data-desktop>
      <div className={styles.workspace}>
        <AboutPanel windowed />
        {open && current ? (
          <AppWindow
            key={open.id}
            title={current.title}
            origin={open.origin}
            onClosed={() => onClosed(open.id)}
          >
            {APPS[open.id]}
          </AppWindow>
        ) : null}
      </div>
      <Dock
        open={open?.id ?? null}
        hint={hint}
        onOpen={onOpen}
        register={register}
      />
    </div>
  );
}
