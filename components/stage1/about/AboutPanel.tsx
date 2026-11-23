import { Fragment } from "react";
import Image from "next/image";
import { about } from "@/content/about";
import { cn } from "@/lib/cn";
import { ChipIcon } from "./ChipIcon";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

export function AboutPanel() {
  const { portrait } = about;

  return (
    <Panel id="about" label="About" className={styles.about}>
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
    </Panel>
  );
}
