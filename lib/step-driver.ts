import { gsap } from "@/lib/gsap";

/**
 * One scroll step is an index derived from the scroll position (the last
 * threshold crossed). Every content element's state is a pure function of that
 * index, so the same position gives the same frame going down and up, and a
 * fling that skips steps lands exactly where a slow scroll would.
 *
 * Content is never toggled by separate onEnter/onLeave callbacks. Instead each
 * group of elements belongs to a Lane: when the step changes, the lane kills
 * its own in-flight tweens and starts new ones toward the state the new step
 * calls for, so fast scrolling cannot stack animations.
 */
export class Lane {
  private tl: gsap.core.Timeline | null = null;
  private key = "";

  /**
   * Move the lane to the state called `key`. `build` adds the tweens that end
   * in that state. With `instant` (a refresh, a jump) the state is reached at
   * once, with no animation. Asking for the state the lane is already in does
   * nothing, unless `instant`.
   */
  to(key: string, instant: boolean, build: (tl: gsap.core.Timeline) => void): void {
    if (!instant && key === this.key) return;
    this.key = key;
    this.tl?.kill();
    // overwrite: "auto" also clears any older tween of the same properties.
    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    build(tl);
    this.tl = tl;
    if (instant) tl.progress(1);
  }

  kill(): void {
    this.tl?.kill();
    this.tl = null;
  }
}

/** Applies the state a step calls for to one lane (or a few). */
export type Channel = (step: number, instant: boolean) => void;

export class StepDriver {
  private index = -2;

  constructor(
    private readonly channels: readonly Channel[],
    private readonly onChange?: (step: number) => void,
  ) {}

  get current(): number {
    return this.index;
  }

  /** The step a scroll position belongs to, given each step's pixel threshold (-1 before the first). */
  static indexAt(scroll: number, thresholds: readonly number[]): number {
    let index = -1;
    for (let i = 0; i < thresholds.length; i++) {
      if (scroll >= thresholds[i]) index = i;
    }
    return index;
  }

  /** Move to `step`, animating every lane toward it. */
  goTo(step: number): void {
    if (step === this.index) return;
    this.index = step;
    this.channels.forEach((apply) => apply(step, false));
    this.onChange?.(step);
  }

  /** Put every lane in `step`'s state with no animation. */
  sync(step: number): void {
    this.index = step;
    this.channels.forEach((apply) => apply(step, true));
    this.onChange?.(step);
  }
}
