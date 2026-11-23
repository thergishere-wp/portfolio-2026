import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./panels.module.css";

interface PanelProps {
  /** Also the data-panel hook the scroll timeline targets. */
  id: "about" | "edu" | "jour" | "now" | "kit";
  label: string;
  /** Grid layout class for this panel. */
  className: string;
  children: ReactNode;
}

/** One full-viewport panel of the iMac screen. */
export function Panel({ id, label, className, children }: PanelProps) {
  return (
    <section
      id={id}
      data-panel={id}
      aria-label={label}
      className={cn(styles.sec, className)}
    >
      {children}
    </section>
  );
}
