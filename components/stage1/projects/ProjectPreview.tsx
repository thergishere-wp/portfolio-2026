"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Project } from "@/content/projects";
import { LaunchingSoonCard } from "./LaunchingSoonCard";
import styles from "./ProjectsAct.module.css";

/** The size the site is laid out at, then scaled down to fit the window. */
const VIRTUAL_W = 1440;
const VIRTUAL_H = 900;

/** Sandbox for preview and viewer frames: enough to run the site, nothing more. */
export const FRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups";

function LiveFrame({ url, title }: { url: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  // The screenshot poster sits underneath until the page has loaded, so a
  // remount (scrolling back) never flashes a blank white frame.
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = (): void =>
      setScale(
        Math.min(box.clientWidth / VIRTUAL_W, box.clientHeight / VIRTUAL_H),
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={styles.frameBox}>
      <iframe
        className={styles.frame}
        src={url}
        title={title}
        loading="lazy"
        sandbox={FRAME_SANDBOX}
        referrerPolicy="no-referrer"
        tabIndex={-1}
        onLoad={() => setLoaded(true)}
        // Runtime values: the scale that fits the 1440x900 page to the window,
        // and the fade-in over the poster once the page has loaded.
        style={{
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
          opacity: loaded ? 1 : 0,
          transition: "opacity .4s",
        }}
      />
    </div>
  );
}

interface ProjectPreviewProps {
  project: Project;
  /** Only the current and the next project's live page is mounted. */
  mounted: boolean;
  /** The act is near: every project shows its (cheap) screenshot poster. */
  near: boolean;
}

/**
 * One project's face inside the window: the live homepage in an iframe when
 * the site allows framing, otherwise the captured screenshot, or the
 * "Launching soon" card when the site is not live. GSAP fades the wrapper.
 */
export function ProjectPreview({ project, mounted, near }: ProjectPreviewProps) {
  let content: ReactNode = null;

  if (project.status === "soon") {
    content = <LaunchingSoonCard />;
  } else {
    // The poster is always there once the act is near, and the live page fades
    // in over it, so the frame looks the same whichever way it was reached.
    content = (
      <>
        {near && project.shot ? (
          <Image
            className={styles.shot}
            src={project.shot}
            alt={`${project.name} homepage`}
            fill
            sizes="45vw"
          />
        ) : null}
        {mounted && project.frameable && project.frameUrl ? (
          <LiveFrame url={project.frameUrl} title={`${project.name} homepage`} />
        ) : null}
      </>
    );
  }

  return (
    <div className={styles.preview} data-preview data-project={project.id}>
      {content}
    </div>
  );
}
