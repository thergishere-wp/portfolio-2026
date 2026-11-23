import { gsap } from "@/lib/gsap";
import { BUDGET, STEP_LEAD } from "@/lib/scroll-budget";
import type { StageLayout } from "@/lib/stage-layout";
import type { Step } from "@/lib/step-sequencer";

interface AboutTimelineParts {
  section: HTMLElement;
  imac: HTMLElement;
  layoutRef: { readonly current: StageLayout };
  /** Total scroll length of the pinned story, in viewport heights. */
  length: number;
}

export interface StoryParts {
  /** The scrubbed timeline: camera moves only. 1 unit = 1 viewport height. */
  timeline: gsap.core.Timeline;
  /** Time-based reveals, in scroll order. */
  steps: Step[];
}

const out = { opacity: 1, y: 0, ease: "power2.out" } as const;

/** A paused timeline for one step. */
export const stepTimeline = (): gsap.core.Timeline =>
  gsap.timeline({ paused: true });

/** Where a step that follows the rest at `rest` is entered. */
export const enterAt = (rest: number): number => rest + STEP_LEAD;

/**
 * The Stage 1 story. Two kinds of motion, never mixed:
 *  - the scrubbed timeline moves only the camera: the iMac zooms into the
 *    display and back out to the rear of the room
 *  - every content reveal is a step, a short time-based timeline that plays in
 *    full when its scroll position is crossed and reverses when it is crossed
 *    back (see StepSequencer)
 * Every size-dependent value is a function, re-read on refresh.
 */
export function buildAboutTimeline({
  section,
  imac,
  layoutRef,
  length,
}: AboutTimelineParts): StoryParts {
  const $ = gsap.utils.selector(section);

  const tl: gsap.core.Timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * tl.duration(),
      // No extra smoothing: Lenis already smooths, and any lag here would make
      // a frame depend on how fast it was reached.
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Camera: zoom into the display.
  const zoomEnd = BUDGET.zoomIn;
  tl.to(
    imac,
    {
      scale: () => layoutRef.current.zoomScale,
      y: () => layoutRef.current.zoomY,
      duration: zoomEnd,
      ease: "power2.inOut",
    },
    0,
  )
    .to($("[data-screen]"), { borderRadius: 0, duration: 0.35 }, zoomEnd - 0.35)
    .to($("[data-glare]"), { opacity: 0, duration: 0.5 }, 0.25);

  // Camera: zoom out to the back of the room, after the desktop stop.
  const outStart = BUDGET.zoomIn + BUDGET.aboutStop;
  tl.to(
    imac,
    {
      scale: () => layoutRef.current.bgScale,
      y: () => layoutRef.current.bgY,
      opacity: 0.3,
      filter: "blur(6px)",
      duration: BUDGET.zoomOut,
      ease: "power2.inOut",
    },
    outStart,
  ).to($("[data-screen]"), { borderRadius: 3, duration: 0.25 }, outStart + 0.25);

  tl.addLabel("about", outStart);

  const steps: Step[] = [];

  // 0. During the zoom: the menu bar, the About window and its contents.
  const aboutIn = stepTimeline()
    .to(
      $("[data-screen-mark]"),
      { opacity: 0, scale: 0.86, filter: "blur(10px)", duration: 0.5 },
      0,
    )
    .fromTo(
      $("[data-menubar]"),
      { opacity: 0, y: -12 },
      { ...out, duration: 0.4 },
      0.1,
    )
    .fromTo(
      $("[data-about-window]"),
      { autoAlpha: 0, y: 70, scale: 0.96 },
      { ...out, autoAlpha: 1, scale: 1, duration: 0.7 },
      0.1,
    )
    .fromTo(
      $('[data-panel="about"] [data-rv], [data-rv-win]'),
      { opacity: 0, y: 40 },
      { ...out, stagger: 0.07, duration: 0.5 },
      0.3,
    );
  steps.push({ at: zoomEnd * 0.55, tl: aboutIn });

  // 1. The desktop stop: the dock rises.
  const dockIn = stepTimeline().fromTo(
    $("[data-dock]"),
    { autoAlpha: 0, y: 40 },
    { ...out, autoAlpha: 1, duration: 0.6 },
    0,
  );
  steps.push({ at: enterAt(zoomEnd), tl: dockIn });

  // 2. The zoom out begins: the desktop leaves, the screen is a faint RG again.
  const aboutOut = stepTimeline()
    .to($("[data-desktop], [data-menubar]"), { autoAlpha: 0, duration: 0.5 }, 0)
    .to(
      $("[data-screen-mark]"),
      { opacity: 0.35, scale: 1, filter: "blur(4px)", duration: 0.5 },
      0.2,
    )
    .to($("[data-orb]"), { opacity: 1, duration: 0.8 }, 0.1);
  steps.push({ at: enterAt(outStart), tl: aboutOut });

  // A zero-length tween at the end gives the timeline its full length.
  tl.to({}, { duration: 0 }, length);
  return { timeline: tl, steps };
}
