import { contact, socials } from "@/content/socials";
import { cn } from "@/lib/cn";
import styles from "./Stage3.module.css";

/** Contact without the 3D phone: reduced motion, or a browser without WebGL. */
export function Stage3Static() {
  return (
    <section id="stage3" className={styles.static} aria-labelledby="contact-title">
      <p className={cn("eyebrow", styles.copyEyebrow)}>{contact.eyebrow}</p>
      <h2 id="contact-title">
        {contact.titleLead} <em>{contact.titleEmphasis}</em>
      </h2>
      <ul className={styles.staticList}>
        {socials.map((social) => (
          <li key={social.id}>
            <a
              className={cn("mwin", styles.staticLink)}
              href={social.href}
              {...(social.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <b>{social.platform}</b>
              <span>{social.handle}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
