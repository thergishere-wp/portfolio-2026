import { FOLD, projectsPxPerUnit, type FoldRig } from "@/lib/fold-rig";
import { gsap } from "@/lib/gsap";
import { BUDGET } from "@/lib/scroll-budget";
import type { Step } from "@/lib/step-sequencer";
import { enterAt, stepTimeline } from "./aboutTimeline";

/** The phone stands 22% of the viewport width left of centre beside the repositories. */
export const ACTIVITY_X = -0.22;

const viewport = (): { vw: number; vh: number } => ({
  vw: document.documentElement.clientWidth,
  vh: window.innerHeight,
});

/** Rig scale (relative to the Projects size) that stands the folded phone 72% of the viewport tall. */
function activityScale(): number {
  const { vw, vh } = viewport();
  return (vh * 0.72) / FOLD.h / projectsPxPerUnit(vw, vh);
}

/** Rig scale that turns the folded phone to landscape across about 62% of the width. */
function landscapeScale(): number {
  const { vw, vh } = viewport();
  const ppu = projectsPxPerUnit(vw, vh);
  const byWidth = (vw * 0.62) / (FOLD.h * ppu);
  // Short enough to leave the headline above it clear.
  const byHeight = (vh * 0.56) / (FOLD.w * ppu);
  return Math.min(byWidth, byHeight);
}

interface DeviceTimelineParts {
  /** The story's scrubbed timeline. */
  timeline: gsap.core.Timeline;
  section: HTMLElement;
  imac: HTMLElement;
  rig: FoldRig;
  steps: Step[];
  /** Where the last project's rest is, in viewport heights. */
  start: number;
}

/**
 * The Activity and Contact part of the story, appended after the last
 * project. Camera moves are scrubbed, reveals are steps:
 *
 *  scrubbed (0.8 vh): the device FOLDS SHUT, tilts back to show its bottom
 *    edge with the USB-C port and speaker holes (the port-first moment), then
 *    stands upright on the left; the Projects section moves up and away so
 *    there is no gap, and the iMac leaves the room
 *  step:     the cover screen cross-fades from the lock screen to the app
 *  step:     the Repositories window slides in (the activity hold, 0.6 vh)
 *  scrubbed (0.6 vh): the device returns to centre and turns to landscape
 *  step:     the repos leave, the cover becomes the socials, headline + email
 */
export function appendDeviceTimeline({
  timeline: tl,
  section,
  imac,
  rig,
  steps,
  start,
}: DeviceTimelineParts): void {
  const $ = gsap.utils.selector(section);
  const activity = start + BUDGET.toActivity;
  const hold = activity + BUDGET.activityHold;
  const contact = hold + BUDGET.toContact;
  const out = { opacity: 1, y: 0, ease: "power2.out" } as const;

  // Scrubbed: fold shut, port-first, upright on the left.
  tl.to(rig, { shut: 1, duration: 0.4, ease: "power2.inOut" }, start)
    .to(
      rig,
      { rx: -1.2, ry: -0.34, rz: 0.1, y: -0.06, duration: 0.4, ease: "power2.inOut" },
      start + 0.05,
    )
    .to(
      rig,
      {
        rx: 0,
        ry: 0,
        rz: 0,
        y: 0,
        x: ACTIVITY_X,
        scale: activityScale,
        duration: 0.3,
        ease: "power3.inOut",
      },
      start + 0.5,
    )
    .to(rig, { shadow: 1, duration: 0.3 }, start + 0.5)
    // The Projects section moves up and away, and the iMac leaves the room.
    .to(
      $("[data-projects-dom]"),
      { yPercent: -115, autoAlpha: 0, duration: 0.55, ease: "power2.in" },
      start,
    )
    .to($("[data-orb]"), { yPercent: -140, duration: 0.6, ease: "power2.in" }, start)
    .to(imac, { opacity: 0, duration: 0.5, ease: "none" }, start);

  // Scrubbed: back to centre, turned to landscape.
  tl.to(rig, { x: 0, shadow: 0, duration: 0.5, ease: "power2.inOut" }, hold + 0.05).to(
    rig,
    { rz: -Math.PI / 2, y: -0.06, scale: landscapeScale, duration: 0.55, ease: "power3.inOut" },
    hold + 0.05,
  );

  tl.addLabel("activity", hold).addLabel("contact", contact);
  tl.to({}, { duration: 0 }, contact);

  // Step: once folded shut, the cover screen shows the app.
  steps.push({
    at: start + 0.4,
    tl: stepTimeline()
      .to(rig, { lock: 0, duration: 0.35 }, 0)
      .to(rig, { app: 1, duration: 0.45 }, 0.15),
  });

  // Step: the activity hold: the Repositories window slides in.
  steps.push({
    at: enterAt(activity),
    tl: stepTimeline().fromTo(
      $("[data-repos]"),
      { autoAlpha: 0, x: 120 },
      { autoAlpha: 1, x: 0, duration: 0.8, ease: "power2.out" },
      0,
    ),
  });

  // Step: contact. The repos leave, the cover becomes the socials.
  steps.push({
    at: enterAt(hold),
    tl: stepTimeline()
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
  });
}
