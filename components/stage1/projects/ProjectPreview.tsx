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
        // Runtime value: the scale that fits the 1440x900 page to the window.
        style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
      />
    </div>
  );
}

interface ProjectPreviewProps {
  project: Project;
  /** Only the current and the next project are mounted. */
  mounted: boolean;
}

/**
 * One project's face inside the window: the live homepage in an iframe when
 * the site allows framing, otherwise the captured screenshot, or the
 * "Launching soon" card when the site is not live. GSAP fades the wrapper.
 */
export function ProjectPreview({ project, mounted }: ProjectPreviewProps) {
  let content: ReactNode = null;

  if (project.status === "soon") {
    content = <LaunchingSoonCard />;
  } else if (mounted && project.frameable && project.frameUrl) {
    content = (
      <LiveFrame url={project.frameUrl} title={`${project.name} homepage`} />
    );
  } else if (mounted && project.shot) {
    content = (
      <Image
        className={styles.shot}
        src={project.shot}
        alt={`${project.name} homepage`}
        fill
        sizes="45vw"
      />
    );
  }

  return (
    <div className={styles.preview} data-preview data-project={project.id}>
      {content}
    </div>
  );
}
