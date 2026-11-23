import { Fragment } from "react";
import { now } from "@/content/about";
import { cn } from "@/lib/cn";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

export function NowPanel() {
  return (
    <Panel id="now" label="Right now" className={styles.now}>
      <div>
        <p className="eyebrow" data-rv>
          {now.eyebrow}
        </p>
        <h2 className={cn("h-serif", styles.big)} data-rv>
          {now.titleLines.map((line, i) => (
            <Fragment key={line}>
              {i > 0 ? <br /> : null}
              {i === now.emphasisLine ? <em>{line}</em> : line}
            </Fragment>
          ))}
        </h2>
      </div>
      <div className={styles.nowGrid}>
        {now.roles.map((role) => (
          <div key={role.title} className={cn("mwin", styles.card)} data-rv>
            <div className={styles.row}>
              <h3 className={styles.cardTitle}>{role.title}</h3>
              <span className={styles.when}>{role.when}</span>
            </div>
            <p className={styles.where}>{role.where}</p>
            <ul className={styles.bullets}>
              {role.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
