import { dock, type AppId } from "@/content/about";
import { cn } from "@/lib/cn";
import { DockIcon } from "./DockIcons";
import styles from "./desktop.module.css";

interface DockProps {
  open: AppId | null;
  /** True until the first click on any icon. */
  hint: boolean;
  onOpen: (id: AppId, button: HTMLButtonElement) => void;
  /** Lets the desktop hand focus back to an icon when its window closes. */
  register: (id: AppId, button: HTMLButtonElement | null) => void;
}

/** The glass dock: real buttons, each labelled, centred at the screen bottom. */
export function Dock({ open, hint, onOpen, register }: DockProps) {
  return (
    <nav className={styles.dockWrap} data-dock aria-label={dock.label}>
      <ul className={styles.dock}>
        {dock.items.map((item) => (
          <li key={item.id}>
            <button
              ref={(el) => register(item.id, el)}
              type="button"
              className={styles.icon}
              aria-label={item.label}
              aria-haspopup="dialog"
              aria-expanded={open === item.id}
              data-label={item.label}
              onClick={(e) => onOpen(item.id, e.currentTarget)}
            >
              <DockIcon id={item.id} />
            </button>
            <span
              className={cn(styles.running, open === item.id && styles.runningOn)}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
      <p className={cn(styles.hint, !hint && styles.hintGone)}>
        <span className={styles.pulse} aria-hidden="true" />
        {dock.hint}
      </p>
    </nav>
  );
}
