"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import dynamic from "next/dynamic";
import { contact } from "@/content/socials";
import { cn } from "@/lib/cn";
import { startGithubPolling, useGithub } from "@/lib/github-store";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  createPhoneRig,
  landscapeScale,
  PHONE_X_WITH_REPOS,
} from "@/lib/phone-rig";
import { registerScrollTarget } from "@/lib/scroll-targets";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import { ReposWindow } from "./ReposWindow";
import { Stage3Static } from "./Stage3Static";
import styles from "./Stage3.module.css";

// Three.js and R3F load only when the stage is near, and never on the server.
const PhoneCanvas = dynamic(() => import("./PhoneCanvas"), { ssr: false });

/** Whether `ref` is within `margin` of the viewport. With `latch`, stays true once seen. */
function useNear(ref: RefObject<Element | null>, margin: string, latch: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear((prev) => (latch && prev ? true : entry.isIntersecting)),
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, latch]);
  return near;
}

let webglSupport: boolean | null = null;

/**
 * Whether WebGL works. Creating a context is slow (it starts the GPU path), so
 * this runs once, only when the 3D stage is about to mount, and releases the
 * test context straight away.
 */
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** The pinned iPhone story: Activity, then Contact. */
function AnimatedStage3({ onUnsupported }: { onUnsupported: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [rig] = useState(createPhoneRig);
  const mounted = useNear(sectionRef, "2500px 0px", true);
  const active = useNear(sectionRef, "200px 0px", false);
  const { repos, unreachable } = useGithub();

  // Start polling GitHub once the stage is near, not on page load.
  useEffect(() => (mounted ? startGithubPolling() : undefined), [mounted]);

  // No WebGL: fall back to the plain contact section, but only once the 3D
  // stage is actually about to load.
  useEffect(() => {
    if (mounted && !hasWebGL()) onUnsupported();
  }, [mounted, onUnsupported]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const $ = gsap.utils.selector(section);
      const out = { opacity: 1, y: 0, ease: "power2.out" };

      const tl: gsap.core.Timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * 7,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      // 1-2. Stand upright, facing the camera, showing the RG logo.
      tl.to(
        rig,
        { rx: 0, ry: 0, rz: 0, scale: 1, y: 0, duration: 1.8, ease: "power3.inOut" },
        0,
      )
        .to(rig, { shadow: 1, duration: 1 }, 0.9)
        // 3. Move left; the screen cross-fades to the app; repos slide in.
        .to(rig, { x: PHONE_X_WITH_REPOS, duration: 1.2, ease: "power2.inOut" }, 2.2)
        .to(rig, { logo: 0, duration: 0.4 }, 2.5)
        .to(rig, { app: 1, duration: 0.5 }, 2.7)
        .fromTo(
          $("[data-repos]"),
          { autoAlpha: 0, x: 120 },
          { autoAlpha: 1, x: 0, duration: 1, ease: "power2.out" },
          2.6,
        )
        // 4. A hold, to use the tabs and scroll the repos list.
        .addLabel("activity", 3.7)
        .to({}, { duration: 1.6 }, 3.7);

      // 5. Repos leave; the phone returns to centre and turns to landscape.
      const t = 5.3;
      tl.to($("[data-repos]"), { autoAlpha: 0, x: 120, duration: 0.7, ease: "power2.in" }, t)
        .to(rig, { x: 0, duration: 1.2, ease: "power2.inOut" }, t + 0.3)
        .to(rig, { shadow: 0, duration: 1 }, t + 0.3)
        .to(
          rig,
          {
            rz: -Math.PI / 2,
            scale: () => landscapeScale(window.innerWidth, window.innerHeight),
            duration: 1.3,
            ease: "power3.inOut",
          },
          t + 0.5,
        )
        .to(rig, { app: 0, duration: 0.4 }, t + 0.6)
        .to(rig, { social: 1, duration: 0.5 }, t + 1.1)
        .fromTo($("[data-a3c]"), { opacity: 0, y: -20 }, { ...out, duration: 0.6 }, t + 1.4)
        // autoAlpha: hidden (and so unfocusable) until it appears, since it holds a link.
        .fromTo(
          $("[data-a3-foot]"),
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.6 },
          t + 1.5,
        )
        .to(rig, { apps: 1, duration: 0.82 }, t + 1.3)
        .addLabel("contact", t + 2.2)
        .to({}, { duration: 0.8 }, t + 2.2);

      const offActivity = registerScrollTarget("activity", tl, "activity");
      const offContact = registerScrollTarget("contact", tl, "contact");
      return () => {
        offActivity();
        offContact();
      };
    },
    { scope: sectionRef, dependencies: [rig] },
  );

  return (
    <section
      id="stage3"
      ref={sectionRef}
      className={styles.stage}
      aria-label="Activity and contact"
    >
      <div className={styles.copy} data-a3c>
        <p className={cn("eyebrow", styles.copyEyebrow)}>{contact.eyebrow}</p>
        <h2>
          {contact.titleLead} <em>{contact.titleEmphasis}</em>
        </h2>
      </div>
      <div ref={canvasWrapRef} className={styles.canvasWrap}>
        {mounted ? (
          <PhoneCanvas rig={rig} portal={canvasWrapRef} active={active} />
        ) : null}
      </div>
      <ReposWindow repos={repos ? repos.repos : null} unreachable={unreachable} />
      <p className={styles.foot} data-a3-foot>
        {contact.emailLead} <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </p>
    </section>
  );
}

export function Stage3() {
  const reduced = usePrefersReducedMotion();
  const [noWebGL, setNoWebGL] = useState(false);
  const markUnsupported = useCallback(() => setNoWebGL(true), []);
  return reduced || noWebGL ? (
    <Stage3Static />
  ) : (
    <AnimatedStage3 onUnsupported={markUnsupported} />
  );
}
