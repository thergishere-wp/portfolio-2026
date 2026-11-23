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
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { STAGE3_RESTS, STEP_LEAD } from "@/lib/scroll-budget";
import { registerSnapSource } from "@/lib/snap-points";
import { StepSequencer, type Step } from "@/lib/step-sequencer";
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

/** The pinned stage is 2.0 viewports of scroll (see lib/scroll-budget.ts). */
const LENGTH = STAGE3_RESTS[STAGE3_RESTS.length - 1];
const enterAt = (rest: number): number => rest + STEP_LEAD;

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
          end: () => "+=" + window.innerHeight * tl.duration(),
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const [toActivity, activityEnd, toContact] = STAGE3_RESTS;

      // Camera only (scrubbed): the phone stands upright, moves left beside
      // the repositories, then comes back and turns to landscape.
      tl.to(
        rig,
        { rx: 0, ry: 0, rz: 0, scale: 1, y: 0, duration: 0.55, ease: "power3.inOut" },
        0,
      )
        .to(rig, { shadow: 1, duration: 0.4 }, 0.25)
        .to(rig, { x: PHONE_X_WITH_REPOS, duration: 0.45, ease: "power2.inOut" }, 0.35)
        .to(rig, { x: 0, duration: 0.45, ease: "power2.inOut" }, activityEnd + 0.05)
        .to(rig, { shadow: 0, duration: 0.4 }, activityEnd + 0.05)
        .to(
          rig,
          {
            rz: -Math.PI / 2,
            scale: () => landscapeScale(window.innerWidth, window.innerHeight),
            duration: 0.55,
            ease: "power3.inOut",
          },
          activityEnd + 0.05,
        )
        .addLabel("activity", activityEnd)
        .addLabel("contact", toContact)
        .to({}, { duration: 0 }, LENGTH);

      // Content (time-based steps, each played in full when entered).
      const steps: Step[] = [
        // 0. The screen crossfades from the logo to the app as the phone arrives.
        {
          at: toActivity * 0.6,
          tl: gsap
            .timeline({ paused: true })
            .to(rig, { logo: 0, duration: 0.35 }, 0)
            .to(rig, { app: 1, duration: 0.45 }, 0.15),
        },
        // 1. The activity hold: the repositories window slides in.
        {
          at: enterAt(toActivity),
          tl: gsap
            .timeline({ paused: true })
            .fromTo(
              $("[data-repos]"),
              { autoAlpha: 0, x: 120 },
              { autoAlpha: 1, x: 0, duration: 0.8, ease: "power2.out" },
              0,
            ),
        },
        // 2. Contact: the repos leave, the screen becomes the socials.
        {
          at: enterAt(activityEnd),
          tl: gsap
            .timeline({ paused: true })
            .to($("[data-repos]"), { autoAlpha: 0, x: 120, duration: 0.5, ease: "power2.in" }, 0)
            .to(rig, { app: 0, duration: 0.35 }, 0.1)
            .to(rig, { social: 1, duration: 0.45 }, 0.3)
            .to(rig, { apps: 1, duration: 0.8 }, 0.35)
            .fromTo($("[data-a3c]"), { opacity: 0, y: -20 }, { ...out, duration: 0.5 }, 0.3)
            // autoAlpha: hidden (and so unfocusable) until it appears, since it holds a link.
            .fromTo(
              $("[data-a3-foot]"),
              { autoAlpha: 0, y: 20 },
              { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.5 },
              0.4,
            ),
        },
      ];

      const startOf = (): number => tl.scrollTrigger?.start ?? 0;
      const px = (vh: number): number => startOf() + vh * window.innerHeight;
      const sequencer = new StepSequencer(steps);
      const evaluate = (scroll: number, instant: boolean): void => {
        const target = StepSequencer.indexAt(
          scroll,
          steps.map((s) => px(s.at)),
        );
        if (instant) sequencer.sync(target);
        else sequencer.goTo(target);
      };
      const follower = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => evaluate(self.scroll(), false),
        onRefresh: (self) => evaluate(self.scroll(), true),
      });

      const offActivity = registerScrollTarget("activity", tl, "activity");
      const offContact = registerScrollTarget("contact", tl, "contact");
      const offSnap = registerSnapSource(() => STAGE3_RESTS.map(px));
      return () => {
        follower.kill();
        sequencer.kill();
        offActivity();
        offContact();
        offSnap();
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
