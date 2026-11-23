"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/gsap";
import type { PhoneRig } from "@/lib/phone-rig";
import type { ScreenMetrics } from "./phone-geometry";
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
export function PhoneScreen({
  rig,
  screen,
}: {
  rig: PhoneRig;
  /** The screen mesh as measured: the DOM is sized and clipped to it. */
  screen: ScreenMetrics;
}) {
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

  // Runtime layout values, all from the measured mesh: the pixel size and the
  // corner radius that clips the content (--sw/--sh feed the rotated socials).
  const size = {
    width: screen.px.w,
    height: screen.px.h,
    "--sw": `${screen.px.w}px`,
    "--sh": `${screen.px.h}px`,
    "--sr": `${screen.px.r}px`,
  } as CSSProperties;

  return (
    <div className={styles.scr} style={size}>
      <div className={styles.island} aria-hidden="true" />
      <div ref={logoRef} className={cn(styles.layer, styles.layerLogo)}>
        <LogoScreen />
      </div>
      <div ref={appRef} className={styles.layer}>
        <AppScreen rig={rig} />
      </div>
      <div ref={socialRef} className={styles.layer}>
        <SocialsScreen rig={rig} />
      </div>
    </div>
  );
}
