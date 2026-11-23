import { education } from "@/content/about";
import { cn } from "@/lib/cn";
import { Panel } from "./Panel";
import styles from "./panels.module.css";

export function EducationPanel() {
  const { gpa, gpaNote } = education;

  return (
    <Panel id="edu" label="Education" className={styles.edu}>
      <div>
        <p className="eyebrow" data-rv>
          {education.eyebrow}
        </p>
        <h2 className={cn("h-serif", styles.big)} data-rv>
          {education.titleLead}
          <br />
          <em>{education.titleEmphasis}</em> {education.titleTail}
        </h2>
        <div className={styles.stat} data-rv>
          <div className={styles.num}>
            {gpa.value}
            <sup>{gpa.unit}</sup>
          </div>
          <p className={styles.statNote}>
            {gpaNote[0]}
            <br />
            {gpaNote[1]}
          </p>
        </div>
      </div>
      <div className={styles.stack}>
        {education.items.map((item) => (
          <div key={item.title} className={cn("mwin", styles.card)} data-rv>
            <div className={styles.row}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <span className={styles.when}>{item.when}</span>
            </div>
            <p className={styles.where}>{item.where}</p>
            {"tag" in item && item.tag ? (
              <span className={styles.tag}>{item.tag}</span>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
