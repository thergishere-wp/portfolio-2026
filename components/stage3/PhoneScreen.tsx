"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/gsap";
import { SCREEN_PX, type PhoneRig } from "@/lib/phone-rig";
import { AppScreen } from "./screen/AppScreen";
import { LogoScreen } from "./screen/LogoScreen";
import { SocialsScreen } from "./screen/SocialsScreen";
import styles from "./screen/screen.module.css";

/** Show a layer at `value` (0 to 1): fade it, hide it when off, and only let it take clicks when on. */
function setLayer(el: HTMLElement, value: number): void {
  const opacity = String(Math.round(value * 1000) / 1000);
  if (el.dataset.opacity === opacity) return;
  el.dataset.opacity = opacity;
  el.style.opacity = opacity;
  el.style.visibility = value <= 0.001 ? "hidden" : "visible";
  el.style.pointerEvents = value > 0.5 ? "auto" : "none";
}

/**
 * The DOM that fills the phone's screen. It renders inside drei's <Html>, so
 * it is real, crisp, clickable DOM. The rig drives the cross-fade between the
 * logo, the app and the socials.
 */
export function PhoneScreen({ rig }: { rig: PhoneRig }) {
  const logoRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (): void => {
      if (logoRef.current) setLayer(logoRef.current, rig.logo);
      if (appRef.current) setLayer(appRef.current, rig.app);
      if (socialRef.current) setLayer(socialRef.current, rig.social);
    };
    apply();
    gsap.ticker.add(apply);
    return () => gsap.ticker.remove(apply);
  }, [rig]);

  // Runtime layout values: the screen's pixel size, for the rotated socials.
  const size = {
    width: SCREEN_PX.w,
    height: SCREEN_PX.h,
    "--sw": `${SCREEN_PX.w}px`,
    "--sh": `${SCREEN_PX.h}px`,
  } as CSSProperties;

  return (
    <div className={styles.scr} style={size}>
      <div className={styles.island} aria-hidden="true" />
      <div ref={logoRef} className={cn(styles.layer, styles.layerLogo)}>
        <LogoScreen />
      </div>
      <div ref={appRef} className={styles.layer}>
        <AppScreen />
      </div>
      <div ref={socialRef} className={styles.layer}>
        <SocialsScreen rig={rig} />
      </div>
    </div>
  );
}
