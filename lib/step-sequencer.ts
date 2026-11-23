import type { gsap } from "@/lib/gsap";

/** One scroll step: a paused, time-based timeline and where its scroll starts. */
export interface Step {
  /** Scroll position (in viewport heights from the top of the pinned story) at which the step is entered. */
  at: number;
  /** Plays when the step is entered, reverses when it is left going back. */
  tl: gsap.core.Timeline;
}

/**
 * Drives time-based reveals from the scroll position.
 *
 * The scrubbed timeline only moves cameras (zoom, device rotation and travel).
 * Every content reveal is a step: a normal timeline of 0.5-0.9 s that plays in
 * full when its scroll position is crossed going down and reverses in full
 * when it is crossed going up. The state shown at any scroll position is a
 * pure function of the step index, so the same position gives the same frame
 * from either direction:
 *  - moving one step plays (or reverses) that step's tween
 *  - jumping several steps finishes (or resets) the skipped ones instantly and
 *    animates only the last one, so nothing depends on the path taken
 *  - `sync` sets every step to its resting state with no animation (used after
 *    a refresh, a snap jump or a deep link)
 */
export class StepSequencer {
  private index = -1;
  private readonly steps: readonly Step[];
  private readonly onChange?: (index: number) => void;

  constructor(steps: readonly Step[], onChange?: (index: number) => void) {
    this.steps = steps;
    this.onChange = onChange;
    steps.forEach((step) => step.tl.pause(0));
  }

  get current(): number {
    return this.index;
  }

  /** The index a scroll position belongs to, given each step's pixel threshold. */
  static indexAt(scroll: number, thresholds: readonly number[]): number {
    let index = -1;
    for (let i = 0; i < thresholds.length; i++) {
      if (scroll >= thresholds[i]) index = i;
    }
    return index;
  }

  /** Move to `target`, animating only the step that is crossed last. */
  goTo(target: number): void {
    const from = this.index;
    if (target === from) return;
    if (target > from) {
      for (let k = from + 1; k < target; k++) this.steps[k].tl.progress(1);
      this.steps[target].tl.timeScale(1).play();
    } else {
      for (let k = from; k > target + 1; k--) this.steps[k].tl.progress(0);
      this.steps[target + 1].tl.timeScale(1).reverse();
    }
    this.index = target;
    this.onChange?.(target);
  }

  /** Set every step to its resting state for `target`, with no animation. */
  sync(target: number): void {
    this.steps.forEach((step, k) => {
      step.tl.pause(k <= target ? step.tl.duration() : 0);
    });
    const changed = this.index !== target;
    this.index = target;
    if (changed) this.onChange?.(target);
  }

  kill(): void {
    this.steps.forEach((step) => step.tl.kill());
  }
}
