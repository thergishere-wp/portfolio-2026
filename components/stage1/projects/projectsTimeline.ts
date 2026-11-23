import { gsap } from "@/lib/gsap";
import { stage1Rests } from "@/lib/scroll-budget";
import type { Step } from "@/lib/step-sequencer";
import { enterAt, stepTimeline } from "../aboutTimeline";

export interface ProjectsProgress {
  /** The project revealed so far (-1 while none is). */
  current: number;
  /** The projects act is close enough to start loading its previews. */
  near: boolean;
}

/** Index of the step that unlocks the first project (see appendProjectsSteps). */
const UNLOCK_STEP = 6;
/** The step from which previews may start loading (the desktop dock is up). */
const NEAR_STEP = 1;

/** The progress a step index stands for. */
export function progressAt(stepIndex: number): ProjectsProgress {
  return {
    current: stepIndex < UNLOCK_STEP ? -1 : stepIndex - UNLOCK_STEP,
    near: stepIndex >= NEAR_STEP,
  };
}

const out = { opacity: 1, y: 0, ease: "power2.out" } as const;
const GREY = "#B4B0A9";
const VIOLET = "#5B3DF5";

/**
 * Appends the projects steps to Stage 1's list. Each one is a time-based
 * timeline of at most 0.9 s, played when its scroll position is crossed and
 * reversed when it is crossed back:
 *  3. enter   the eyebrow, the "Projects" title and the (locked) window
 *  4. list    all five names drop in, staggered
 *  5. first   the first name turns violet; the lock's shackle lifts and opens
 *  6. unlock  the lock fades, the live page fades in, the overview card pops in
 *  7-10. next the previous name greys out, the new one turns violet, the page
 *            and the card swap (no lock, no buffer)
 * Returns the story's length in viewport heights (the last rest).
 */
export function appendProjectsSteps(section: HTMLElement, steps: Step[]): number {
  const $ = gsap.utils.selector(section);
  const items = $<HTMLElement>("[data-p]");
  const screens = $<HTMLElement>("[data-preview]");
  const minis = $<HTMLElement>("[data-minic]");
  const rests = stage1Rests(items.length);
  gsap.set([...screens, ...minis], { autoAlpha: 0 });

  const text = (i: number): Element[] => [...items[i].querySelectorAll("[data-ptext]")];

  // 3. Enter.
  steps.push({
    at: enterAt(rests[2]),
    tl: stepTimeline()
      .fromTo(
        $("[data-a2-rv]"),
        { opacity: 0, y: 60 },
        { ...out, stagger: 0.1, duration: 0.7 },
        0,
      )
      .fromTo(
        $("[data-win]"),
        { autoAlpha: 0, y: 100, scale: 0.93 },
        { ...out, autoAlpha: 1, scale: 1, duration: 0.8 },
        0.1,
      ),
  });

  // 4. The list.
  steps.push({
    at: enterAt(rests[3]),
    tl: stepTimeline().fromTo(
      items,
      { opacity: 0, y: 36 },
      { ...out, stagger: 0.07, duration: 0.55 },
      0,
    ),
  });

  // 5. The first project: violet, and the shackle lifts and swings open.
  steps.push({
    at: enterAt(rests[4]),
    tl: stepTimeline()
      .to(text(0), { color: VIOLET, duration: 0.4 }, 0)
      .to($("[data-shackle]"), { y: -3.2, duration: 0.25, ease: "back.out(3)" }, 0.1)
      .to(
        $("[data-shackle]"),
        { rotation: -32, svgOrigin: "16 11", duration: 0.35, ease: "power2.out" },
        0.35,
      ),
  });

  // 6. Unlock: the lock fades and the first project's page and card appear.
  steps.push({
    at: enterAt(rests[5]),
    tl: stepTimeline()
      .to($("[data-lock]"), { opacity: 0, scale: 0.85, duration: 0.35 }, 0)
      .fromTo(
        screens[0],
        { autoAlpha: 0, scale: 1.04 },
        { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" },
        0.1,
      )
      .fromTo(
        screens[0].querySelectorAll("[data-reveal]"),
        { y: 26, opacity: 0 },
        { ...out, stagger: 0.07, duration: 0.45 },
        0.25,
      )
      .fromTo(
        minis[0],
        { autoAlpha: 0, scale: 0.86, y: 30 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" },
        0.3,
      ),
  });

  // 7-10. Each next project.
  for (let i = 1; i < items.length; i++) {
    steps.push({
      at: enterAt(rests[5 + i]),
      tl: stepTimeline()
        .to(text(i - 1), { color: GREY, duration: 0.4 }, 0)
        .to(text(i), { color: VIOLET, duration: 0.4 }, 0.15)
        .to(screens[i - 1], { autoAlpha: 0, duration: 0.35 }, 0)
        .to(minis[i - 1], { autoAlpha: 0, y: 20, duration: 0.3 }, 0)
        .fromTo(
          screens[i],
          { autoAlpha: 0, scale: 1.04 },
          { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" },
          0.2,
        )
        .fromTo(
          screens[i].querySelectorAll("[data-reveal]"),
          { y: 26, opacity: 0 },
          { ...out, stagger: 0.07, duration: 0.45 },
          0.35,
        )
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
