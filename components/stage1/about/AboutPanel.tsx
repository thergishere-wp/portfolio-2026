import { Fragment } from "react";
import Image from "next/image";
import { about } from "@/content/about";
import { cn } from "@/lib/cn";
import { ChipIcon } from "./ChipIcon";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

/**
 * About. Plain, it is a full-viewport section (the reduced-motion layout).
 * `windowed`, it is the window that is open by default on the iMac desktop.
 */
export function AboutPanel({ windowed = false }: { windowed?: boolean }) {
  const { portrait } = about;

  const content = (
    <>
      <div>
        <p className="eyebrow" data-rv>
          {about.eyebrow}
        </p>
        <h1 className={cn("h-serif", styles.name)} data-rv>
          {about.nameFirst}
          <br />
          <em>{about.nameLast}</em>
        </h1>
        <p className={styles.lede} data-rv>
          {about.lede.map((run, i) =>
            "strong" in run && run.strong ? (
              <strong key={i}>{run.text}</strong>
            ) : (
              <Fragment key={i}>{run.text}</Fragment>
            ),
          )}
        </p>
        <div className={cn("chips", styles.aboutChips)} data-rv>
          {about.chips.map((chip) => (
            <span key={chip.label} className="chip">
              <ChipIcon name={chip.icon} />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <div className={cn("mwin", styles.pwin)} data-rv-win>
        <div className="mwin-bar">
          <i />
          <i />
          <i />
          <span className="mwin-title">{portrait.fileName}</span>
        </div>
        <Image
          className={styles.portrait}
          src={portrait.src}
          alt={portrait.alt}
          width={portrait.width}
          height={portrait.height}
          sizes="30vw"
          loading="eager"
        />
        <div className={styles.cap}>
          <span>{portrait.captionLeft}</span>
          <span>{portrait.captionRight}</span>
        </div>
      </div>
    </>
  );

  if (!windowed) {
    return (
      <Panel id="about" label="About" className={styles.about}>
        {content}
      </Panel>
    );
  }

  return (
    <section
      id="about"
      data-panel="about"
      data-about-window
      aria-label="About"
      className={cn("mwin", styles.winAbout)}
    >
      <div className="mwin-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span className="mwin-title">About — Pasindu</span>
      </div>
      <div className={styles.winBody}>{content}</div>
    </section>
  );
}
