import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";
import styles from "./RgMark.module.css";

/**
 * The RG mark with its blinking violet dot. Size it with font-size from the
 * parent. The data-ch / data-dot hooks are what the intro animates.
 */
export function RgMark({ className, ...rest }: ComponentPropsWithRef<"span">) {
  return (
    <span className={cn(styles.mark, className)} {...rest}>
      <span className={styles.clip}>
        <span className={styles.ch} data-ch>
          R
        </span>
        <span className={styles.ch} data-ch>
          G
        </span>
      </span>
      <span className={styles.dot} data-dot />
    </span>
  );
}
