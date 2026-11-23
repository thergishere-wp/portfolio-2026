"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { contact, socials, type SocialId } from "@/content/socials";
import { gsap } from "@/lib/gsap";
import type { FoldRig } from "@/lib/fold-rig";
import styles from "./screen.module.css";

const ICONS: Record<SocialId, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8h2.5V4.5H14c-2.8 0-4.3 1.8-4.3 4.5v2H7.5v3.5h2.2V21h3.5v-6.5h2.6l.5-3.5h-3.1V9.3c0-.8.4-1.3 1.3-1.3z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6.2" cy="6.3" r="1.9" />
      <rect x="4.5" y="9.5" width="3.4" height="10.5" rx=".4" />
      <path d="M10.4 9.5h3.2v1.5c.6-1 1.8-1.8 3.4-1.8 2.6 0 3.6 1.6 3.6 4.4V20h-3.4v-5.8c0-1.3-.4-2.2-1.6-2.2s-1.8.9-1.8 2.2V20h-3.4z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
};

/** Icons enter one after another over the first part of the progress. */
const STAGGER = 0.08;
const ICON_SPAN = 0.5;
const TOTAL = ICON_SPAN + STAGGER * (socials.length - 1);

/**
 * The landscape screen: "Say hello." and five app-style icons spread evenly,
 * each showing the profile handle under the logo. It is laid out upright for
 * landscape (the phone turns), clear of the Dynamic Island. The rig's `apps`
 * progress drives the entrance.
 */
export function SocialsScreen({ rig }: { rig: Pick<FoldRig, "apps"> }) {
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const apply = (): void => {
      refs.current.forEach((el, i) => {
        if (!el) return;
        const p = gsap.utils.clamp(0, 1, (rig.apps * TOTAL - i * STAGGER) / ICON_SPAN);
        el.style.opacity = String(p);
        el.style.transform = `translateY(${14 * (1 - p)}px)`;
      });
    };
    apply();
    gsap.ticker.add(apply);
    return () => gsap.ticker.remove(apply);
  }, [rig]);

  return (
    <div className={styles.social}>
      <div className={styles.rot}>
        <h3 className={styles.hello}>
          {contact.screenLead} <em>{contact.screenEmphasis}</em>
        </h3>
        <p className={styles.sub}>{contact.screenSub}</p>
        <ul className={styles.apps}>
          {socials.map((social, i) => (
            <li
              key={social.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
            >
              <a
                className={styles.socialLink}
                href={social.href}
                aria-label={social.platform}
                {...(social.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <i className={`${styles.socialIcon} ${styles[social.id]}`}>
                  {ICONS[social.id]}
                </i>
                <span>{social.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
