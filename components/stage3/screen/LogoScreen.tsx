import { RgMark } from "@/components/chrome/RgMark";
import styles from "./screen.module.css";

/** The phone's first screen: the RG mark with its blinking dot. */
export function LogoScreen() {
  return (
    <div className={styles.logo} aria-hidden="true">
      <RgMark className={styles.logoMark} />
    </div>
  );
}
