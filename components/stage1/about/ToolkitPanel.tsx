import { toolkit } from "@/content/about";
import { cn } from "@/lib/cn";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

export function ToolkitPanel() {
  return (
    <Panel id="kit" label="Toolkit" className={styles.kit}>
      <div>
        <p className="eyebrow" data-rv>
          {toolkit.eyebrow}
        </p>
        <h2 className={cn("h-serif", styles.big)} data-rv>
          {toolkit.titleLead}
          <br />
          <em>{toolkit.titleEmphasis}</em>
        </h2>
        <div className={cn("mwin", styles.card, styles.offclock)} data-rv>
          <h3 className={styles.groupTitle}>{toolkit.offClockTitle}</h3>
          <div className="chips">
            {toolkit.offClock.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.kitGrid}>
        {toolkit.groups.map((group) => (
          <div key={group.title} className={cn("mwin", styles.card)} data-rv>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <div className="chips">
              {group.items.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
