import { projects } from "@/content/projects";
import type { FoldRig } from "@/lib/fold-rig";
import { gsap } from "@/lib/gsap";
import { stage1Rests } from "@/lib/scroll-budget";
import type { Step } from "@/lib/step-sequencer";
import { enterAt, stepTimeline } from "../aboutTimeline";

export interface ProjectsProgress {
  /** The project unlocked so far (-1 while none is). */
  current: number;
  /** The projects act is close enough to start loading its previews. */
  near: boolean;
  /** The device has been shown (S0 or later). */
  deviceShown: boolean;
}

/** Index of the step that unlocks the first project (see appendProjectsSteps). */
const UNLOCK_STEP = 6;
/** The step from which previews may start loading (the desktop dock is up). */
const NEAR_STEP = 1;
/** The step that shows the first project's list entry (names are in). */
export const FIRST_PROJECT_STEP = UNLOCK_STEP;

/** The progress a step index stands for. */
export function progressAt(stepIndex: number): ProjectsProgress {
  return {
    current: stepIndex < UNLOCK_STEP ? -1 : stepIndex - UNLOCK_STEP,
    near: stepIndex >= NEAR_STEP,
    deviceShown: stepIndex >= 3,
  };
}

const out = { opacity: 1, y: 0, ease: "power2.out" } as const;
const GREY = "#B4B0A9";
const VIOLET = "#5B3DF5";

/**
 * Appends the projects steps to the story's list. Each is a time-based
 * timeline played when its scroll position is crossed and reversed when it is
 * crossed back:
 *  3. S0 enter   the eyebrow and "Projects" title; the FOLDED device floats in
 *  4. S1 list    all five names drop in at once, staggered
 *  5. S2 first   Kai-Flo turns violet; the device UNFOLDS (hinge 180 -> 0 in
 *                0.9 s, turning toward the camera) and the lock appears
 *  6. S3 unlock  the shackle lifts and swings, the lock fades, the live page
 *                fades in over the screenshot, the overview card pops in
 *  7-10. S4-S7   the previous name greys out, the next turns violet, the card
 *                swaps, and the screen changes with that project's own
 *                transition (no lock, no buffer)
 * Returns the story's length in viewport heights (the last rest).
 */
export function appendProjectsSteps(
  section: HTMLElement,
  steps: Step[],
  rig: FoldRig,
): number {
  const $ = gsap.utils.selector(section);
  const items = $<HTMLElement>("[data-p]");
  const minis = $<HTMLElement>("[data-minic]");
  const rests = stage1Rests(items.length);
  gsap.set(minis, { autoAlpha: 0 });

  const text = (i: number): Element[] => [...items[i].querySelectorAll("[data-ptext]")];
  const live = (i: number): boolean => Boolean(projects[i].frameable && projects[i].frameUrl);

  // 3. S0: the title, and the folded device floats in.
  steps.push({
    at: enterAt(rests[2]),
    tl: stepTimeline()
      .fromTo(
        $("[data-a2-rv]"),
        { opacity: 0, y: 60 },
        { ...out, stagger: 0.1, duration: 0.7 },
        0,
      )
      .to(rig, { show: 1, duration: 0.9, ease: "power2.out" }, 0.1),
  });

  // 4. S1: all five names drop in at once.
  steps.push({
    at: enterAt(rests[3]),
    tl: stepTimeline().fromTo(
      items,
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, ease: "power2.out", stagger: 0.07, duration: 0.55 },
      0,
    ),
  });

  // 5. S2: Kai-Flo turns violet and the device unfolds.
  steps.push({
    at: enterAt(rests[4]),
    tl: stepTimeline()
      .to(text(0), { color: VIOLET, duration: 0.4 }, 0)
      .to(rig, { unfold: 1, turn: 0, duration: 0.9, ease: "power2.inOut" }, 0)
      .to(rig, { chip: 1, duration: 0.35, ease: "power2.out" }, 0.7),
  });

  // 6. S3: unlock. The lock plays, then the live page fades in.
  steps.push({
    at: enterAt(rests[5]),
    tl: stepTimeline()
      .to(rig, { open: 1, duration: 0.55, ease: "power2.out" }, 0)
      .to(rig, { chip: 0, duration: 0.3 }, 0.5)
      .to(rig.frames, { 0: live(0) ? 1 : 0, duration: 0.5, ease: "power2.out" }, 0.5)
      .fromTo(
        minis[0],
        { autoAlpha: 0, scale: 0.86, y: 30 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" },
        0.45,
      ),
  });

  // 7-10. S4-S7: each next project, with its own screen transition.
  for (let i = 1; i < items.length; i++) {
    steps.push({
      at: enterAt(rests[5 + i]),
      tl: stepTimeline()
        .to(text(i - 1), { color: GREY, duration: 0.4 }, 0)
        .to(text(i), { color: VIOLET, duration: 0.4 }, 0.15)
        .to(minis[i - 1], { autoAlpha: 0, y: 20, duration: 0.3 }, 0)
        // The live page steps aside, the screenshot transition plays, then
        // the new live page fades in over it.
        .to(rig.frames, { [i - 1]: 0, duration: 0.2 }, 0)
        // Slightly after 0 so that reversing to the start undoes it (a
        // zero-length tween at exactly 0 can never be reverted). Reversed, the
        // rig is left exactly as the previous step left it.
        .set(rig, { from: i - 1, to: i, trans: 0 }, 0.001)
        .to(rig, { trans: 1, duration: 0.8, ease: "power1.inOut" }, 0.1)
        .to(rig.frames, { [i]: live(i) ? 1 : 0, duration: 0.4 }, 0.55)
        .fromTo(
          minis[i],
          { autoAlpha: 0, scale: 0.86, y: 30 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" },
          0.35,
        ),
    });
  }

  return rests[rests.length - 1];
}
