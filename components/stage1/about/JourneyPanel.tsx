import { journey } from "@/content/about";
import { cn } from "@/lib/cn";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

export function JourneyPanel() {
  return (
    <Panel id="jour" label="Journey" className={styles.jour}>
      <div>
        <p className="eyebrow" data-rv>
          {journey.eyebrow}
        </p>
        <h2 className={cn("h-serif", styles.big)} data-rv>
          {journey.titleLead} <em>{journey.titleEmphasis}</em>
          <br />
          {journey.titleTail}
        </h2>
        <p className={styles.footNote} data-rv>
          {journey.note}
        </p>
      </div>
      <ol className={styles.tline}>
        {journey.items.map((item) => (
          <li key={item.year} data-rv>
            <span className={styles.yr}>{item.year}</span>
            <div>
              <h3 className={styles.tTitle}>{item.title}</h3>
              <p className={styles.tBody}>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
