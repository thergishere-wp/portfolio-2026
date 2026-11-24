import { FOLD, projectsPxPerUnit, type FoldRig } from "@/lib/fold-rig";
import { gsap } from "@/lib/gsap";
import { BUDGET, STEP_LEAD } from "@/lib/scroll-budget";

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
  /** Where the last project's rest is, in viewport heights. */
  start: number;
}

/**
 * The unfold, then the Activity and Contact camera moves, appended after the
 * last project. All of it is scrubbed (the position is exactly the scroll), so nothing here can
 * run ahead of, or lag behind, the user.
 *
 * Fold -> Activity (1.0 vh), as one continuous move:
 *   0.00  the overview card leaves first
 *   0.08  the list names slide out to the left, staggered
 *   0.35  then the title
 *   0.10  the phone folds shut while it turns so its bottom edge (USB-C,
 *         speakers) faces the camera, travelling left all the while
 *   0.50  and stands upright on the left
 *
 * Activity hold (0.6 vh): nothing moves. The repositories window leaves in
 * the last 0.25 vh of it, so it is fully gone before the phone starts to turn.
 *
 * Activity -> Contact (0.8 vh): the phone returns to the centre and turns to
 * landscape.
 */
export function appendDeviceTimeline({
  timeline: tl,
  section,
  imac,
  rig,
  start,
}: DeviceTimelineParts): void {
  const $ = gsap.utils.selector(section);

  // The unfold is a camera move, so it is scrubbed, and linear so that it
  // really is spread over the ticks: 0.42 vh is about 3.4 wheel ticks of 100 px
  // at 812 px, the lock screen then waits a moment before the unlock step
  // slides it away.
  const first =
    BUDGET.zoomIn + BUDGET.aboutStop + BUDGET.zoomOut + BUDGET.projEnter + BUDGET.projList;
  tl.to(rig, { unfold: 1, turn: 0, duration: 0.42, ease: "none" }, first + STEP_LEAD);

  const activity = start + BUDGET.toActivity;
  const hold = activity + BUDGET.activityHold;
  const contact = hold + BUDGET.toContact;

  // The Projects text leaves to the left, in order.
  tl.to(
    $("[data-minis]"),
    { autoAlpha: 0, x: -36, duration: 0.12, ease: "power2.in" },
    start,
  )
    .to(
      $("[data-p]"),
      { xPercent: -140, stagger: 0.04, duration: 0.25, ease: "power2.in" },
      start + 0.08,
    )
    .to(
      $("[data-a2-rv]"),
      { xPercent: -140, stagger: 0.05, duration: 0.25, ease: "power2.in" },
      start + 0.35,
    )
    .to($("[data-orb]"), { yPercent: -140, duration: 0.6, ease: "power2.in" }, start + 0.1)
    .to(imac, { opacity: 0, duration: 0.5, ease: "none" }, start);

  // The phone: folds shut, port-first, travels left and stands upright. The
  // travel is one continuous move, so there is no flat-lying pose in the middle.
  tl.to(rig, { shut: 1, duration: 0.45, ease: "power2.inOut" }, start + 0.1)
    .to(
      rig,
      { rx: -0.95, ry: -0.3, rz: 0.08, y: -0.05, duration: 0.35, ease: "power2.inOut" },
      start + 0.1,
    )
    .to(
      rig,
      { rx: 0, ry: 0, rz: 0, y: 0, duration: 0.4, ease: "power3.inOut" },
      start + 0.5,
    )
    .to(
      rig,
      { x: ACTIVITY_X, scale: activityScale, duration: 0.75, ease: "power2.inOut" },
      start + 0.15,
    )
    .to(rig, { shadow: 1, duration: 0.3 }, start + 0.65);

  // The repositories window leaves, fully, before the phone starts to turn.
  tl.to(
    $("[data-repos]"),
    { xPercent: 130, duration: 0.25, ease: "power2.in" },
    hold - 0.25,
  );

  // Back to the centre, turned to landscape.
  tl.to(rig, { x: 0, shadow: 0, duration: 0.5, ease: "power2.inOut" }, hold).to(
    rig,
    { rz: -Math.PI / 2, y: -0.06, scale: landscapeScale, duration: BUDGET.toContact, ease: "power3.inOut" },
    hold,
  );

  tl.addLabel("activity", activity).addLabel("contact", contact);
  tl.to({}, { duration: 0 }, contact);
}
