/**
 * The scroll budget, in viewport heights, from the top of the page to Contact.
 * One timeline unit is one viewport height of scroll (end = "+=" + vh * units),
 * so these numbers are the real scroll lengths. Total must stay <= 8.5.
 *
 * There is no snapping: the user always controls the position. Camera moves
 * (zoom, fold, turn) are scrubbed over their segment; content changes are
 * triggered at a threshold at the start of their segment (see story-steps.ts)
 * and play in full in 0.5-0.8 s.
 */
export const BUDGET = {
  /** Intro screen -> iMac zooms into the About desktop (scrubbed). */
  zoomIn: 0.8,
  /** About desktop stop. */
  aboutStop: 0.6,
  /** Zoom out into Projects (scrubbed). */
  zoomOut: 0.5,
  /** Projects steps. */
  projEnter: 0.5,
  projList: 0.5,
  projFirst: 0.5,
  projUnlock: 0.5,
  projNext: 0.45,
  /** Overview card, list and title leave; the phone folds shut, port-first, and stands upright on the left (scrubbed). */
  toActivity: 1.0,
  /** Activity hold (the repositories window is shown). */
  activityHold: 0.6,
  /** The repositories leave, the phone returns to centre and turns to landscape (scrubbed). */
  toContact: 0.8,
} as const;

/** A step is entered this far (in vh) after its segment starts. */
export const STEP_LEAD = 0.02;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Segment boundaries of Stage 1 (up to the last project), in vh from the top of the pinned story. */
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
 * The whole story's boundaries, in vh from the top: Stage 1's, then the
 * Activity phone, the end of the Activity hold and Contact. The last one is
 * the story's length.
 */
export function storyRests(projectCount: number): number[] {
  const rests = stage1Rests(projectCount);
  const lastProject = rests[rests.length - 1];
  const activity = round(lastProject + BUDGET.toActivity);
  const hold = round(activity + BUDGET.activityHold);
  const contact = round(hold + BUDGET.toContact);
  return [...rests, activity, hold, contact];
}
