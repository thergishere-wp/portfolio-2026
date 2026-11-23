/**
 * The scroll budget, in viewport heights, from the top of the page to Contact.
 * One timeline unit is one viewport height of scroll (end = "+=" + vh * units),
 * so these numbers are the real scroll lengths. Total must stay <= 8.5.
 *
 * Every segment ends at a snap point (a "rest"), where Lenis Snap settles.
 */
export const BUDGET = {
  /** Intro screen -> iMac zooms into the About desktop. */
  zoomIn: 1.0,
  /** About desktop stop. */
  aboutStop: 0.4,
  /** Zoom out into Projects. */
  zoomOut: 0.5,
  /** Projects steps. */
  projEnter: 0.3,
  projList: 0.3,
  projFirst: 0.4,
  projUnlock: 0.3,
  projNext: 0.35,
  /** Fold shut, port-first, upright on the left: the Activity phone. */
  toActivity: 0.8,
  /** Activity hold (the repositories window comes in). */
  activityHold: 0.6,
  /** Turn to landscape: Contact. */
  toContact: 0.6,
} as const;

/** A step is entered this far (in vh) after the previous rest, so a tiny scroll already plays it. */
export const STEP_LEAD = 0.02;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Rest positions of Stage 1, in vh from the top of the pinned story. */
export function stage1Rests(projectCount: number): number[] {
  const rests: number[] = [];
  let t = 0;
  const push = (length: number): void => {
    t += length;
    rests.push(round(t));
  };
  push(BUDGET.zoomIn);
  push(BUDGET.aboutStop);
  push(BUDGET.zoomOut);
  push(BUDGET.projEnter);
  push(BUDGET.projList);
  push(BUDGET.projFirst);
  push(BUDGET.projUnlock);
  for (let i = 1; i < projectCount; i++) push(BUDGET.projNext);
  return rests;
}

/**
 * The whole story's rests, in vh from the top: Stage 1's, then the Activity
 * phone, the Activity hold and Contact. The last one is the story's length.
 */
export function storyRests(projectCount: number): number[] {
  const rests = stage1Rests(projectCount);
  const lastProject = rests[rests.length - 1];
  const activity = round(lastProject + BUDGET.toActivity);
  const hold = round(activity + BUDGET.activityHold);
  const contact = round(hold + BUDGET.toContact);
  return [...rests, activity, hold, contact];
}
