import { projects } from "@/content/projects";
import type { FoldRig } from "@/lib/fold-rig";
import { gsap } from "@/lib/gsap";
import { BUDGET, STEP_LEAD, stage1Rests } from "@/lib/scroll-budget";
import { Lane, type Channel } from "@/lib/step-driver";
import { LOCK_TEXTURE } from "../story/fold-screen";

/**
 * The story's steps. `step` is derived from the scroll position (the last
 * threshold crossed, -1 before the first) and EVERY content element's state is
 * a pure function of it (see StepDriver). The scrubbed timeline moves only
 * cameras; nothing here is tied to a direction of travel.
 *
 *   0  about in      the menu bar, the About window and its text
 *   1  dock          the desktop stop: the dock rises
 *   2  about out     the zoom out begins: the desktop leaves
 *   3  enter         "Projects" title; the folded device floats in
 *   4  list          all five names
 *   5  first         Kai-Flo is violet; the device unfolds and shows its lock screen
 *   6  unlock        the lock icon opens, the lock screen slides up; overview card
 *   7+ next          the next project (its own screen transition)
 *   .. fold          the scrub takes the card, list and title out and folds the phone
 *   .. activity      the repositories slide in (the phone is ~85% of the way)
 *   .. contact       the cover becomes the socials; headline and email
 */
export const STEP = {
  ABOUT_IN: 0,
  DOCK: 1,
  ABOUT_OUT: 2,
  ENTER: 3,
  LIST: 4,
  FIRST: 5,
  UNLOCK: 6,
} as const;

export interface StepMap {
  fold: number;
  activity: number;
  contact: number;
  count: number;
}

export function stepMap(projectCount: number): StepMap {
  const fold = STEP.UNLOCK + projectCount;
  return { fold, activity: fold + 1, contact: fold + 2, count: fold + 3 };
}

/** How far into the fold -> Activity scrub (vh) the repositories slide in: the phone is ~85% of the way. */
export const ACTIVITY_IN = 0.7;
/** How far into the landscape turn (vh) the cover becomes the socials: the phone is already past 45 degrees. */
export const CONTACT_IN = 0.48;

/** Where each step is entered, in viewport heights from the top of the pinned story. */
export function stepThresholds(projectCount: number): number[] {
  const rests = stage1Rests(projectCount);
  const fold = rests[rests.length - 1];
  const hold = fold + BUDGET.toActivity + BUDGET.activityHold;
  const thresholds = [
    BUDGET.zoomIn * 0.55,
    rests[0] + STEP_LEAD,
    rests[1] + STEP_LEAD,
    rests[2] + STEP_LEAD,
    rests[3] + STEP_LEAD,
    rests[4] + STEP_LEAD,
    rests[5] + STEP_LEAD,
  ];
  // Project 1..n-1: each starts at the previous project's rest.
  for (let i = 1; i < projectCount; i++) thresholds.push(rests[5 + i] + STEP_LEAD);
  thresholds.push(fold + STEP_LEAD, fold + ACTIVITY_IN, hold + CONTACT_IN);
  return thresholds.map((t) => Math.round(t * 1000) / 1000);
}

export interface StoryProgress {
  /** The project the steps have unlocked (-1 while locked). */
  current: number;
  /** The projects act is close enough to start loading its previews. */
  near: boolean;
  /** The device has been shown. */
  deviceShown: boolean;
}

/** The progress a step index stands for. */
export function progressAt(step: number, projectCount: number): StoryProgress {
  return {
    // The steps after the last project leave the last project as the current one.
    current: step < STEP.UNLOCK ? -1 : Math.min(step - STEP.UNLOCK, projectCount - 1),
    near: step >= STEP.DOCK,
    deviceShown: step >= STEP.ENTER,
  };
}

/**
 * An inactive layer must not take clicks, not even during its fade out: set
 * at the start of the lane's move, so a layer is never hit-testable unless its
 * step is active.
 */
const clicks = (tl: gsap.core.Timeline, targets: gsap.TweenTarget, on: boolean): void => {
  tl.set(targets, { pointerEvents: on ? "auto" : "none" }, 0);
};

const GREY = "#B4B0A9";
const VIOLET = "#5B3DF5";

/** The index of the active (violet) name at a step (-1 before the first). */
function activeName(step: number, count: number): number {
  if (step < STEP.FIRST) return -1;
  if (step <= STEP.UNLOCK) return 0;
  return Math.min(step - STEP.UNLOCK, count - 1);
}

/**
 * Every content channel. Each one reads the step and moves its lanes to the
 * state that step calls for.
 */
export function createStoryChannels(
  section: HTMLElement,
  rig: FoldRig,
): { channels: Channel[]; kill: () => void } {
  const $ = gsap.utils.selector(section);
  const n = projects.length;
  const map = stepMap(n);
  const live = (i: number): boolean => Boolean(projects[i].frameable && projects[i].frameUrl);

  const items = $<HTMLElement>("[data-p]");
  const names = items.map((item) => [...item.querySelectorAll<HTMLElement>("[data-ptext]")]);
  // The names' resting colours, read from the page's own styles.
  const rest = names.map((els) => els.map((el) => getComputedStyle(el).color));

  const mark = $("[data-screen-mark]");
  let markInitial: gsap.TweenVars | null = null;

  const lanes = {
    mark: new Lane(),
    chrome: new Lane(),
    about: new Lane(),
    dock: new Lane(),
    orbs: new Lane(),
    title: new Lane(),
    list: new Lane(),
    colors: new Lane(),
    card: new Lane(),
    device: new Lane(),
    cover: new Lane(),
    screen: new Lane(),
    frames: new Lane(),
    repos: new Lane(),
    contact: new Lane(),
  };

  // ---- About ---------------------------------------------------------------
  const about: Channel = (step, instant) => {
    const aboutOn = step >= STEP.ABOUT_IN;
    const out = step >= STEP.ABOUT_OUT;

    // The RG mark: as the intro left it, then gone, then a faint backdrop.
    if (aboutOn && !markInitial && mark[0]) {
      markInitial = {
        opacity: Number(gsap.getProperty(mark[0], "opacity")),
        scale: Number(gsap.getProperty(mark[0], "scale")),
        filter: String(gsap.getProperty(mark[0], "filter")),
      };
    }
    if (markInitial) {
      const state = out ? "out" : aboutOn ? "gone" : "intro";
      lanes.mark.to(state, instant, (tl) => {
        if (state === "intro") tl.to(mark, { ...markInitial, duration: 0.4 }, 0);
        else if (state === "gone") {
          tl.to(mark, { opacity: 0, scale: 0.86, filter: "blur(10px)", duration: 0.5 }, 0);
        } else {
          tl.to(mark, { opacity: 0.35, scale: 1, filter: "blur(4px)", duration: 0.5 }, 0.2);
        }
      });
    }

    lanes.chrome.to(`${aboutOn}${out}`, instant, (tl) => {
      tl.to(
        $("[data-menubar]"),
        out
          ? { autoAlpha: 0, duration: 0.5 }
          : { autoAlpha: aboutOn ? 1 : 0, y: aboutOn ? 0 : -12, duration: 0.4 },
        aboutOn && !out ? 0.1 : 0,
      ).to($("[data-desktop]"), { autoAlpha: out ? 0 : 1, duration: 0.5 }, 0);
      clicks(tl, $("[data-desktop]"), !out);
    });

    lanes.about.to(`${aboutOn}`, instant, (tl) => {
      tl.to(
        $("[data-about-window]"),
        aboutOn
          ? { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "power2.out" }
          : { autoAlpha: 0, y: 70, scale: 0.96, duration: 0.4 },
        aboutOn ? 0.1 : 0,
      ).to(
        $('[data-panel="about"] [data-rv], [data-rv-win]'),
        aboutOn
          ? { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: "power2.out" }
          : { opacity: 0, y: 40, duration: 0.3 },
        aboutOn ? 0.3 : 0,
      );
      clicks(tl, $("[data-about-window]"), aboutOn && !out);
    });

    lanes.dock.to(`${step >= STEP.DOCK}`, instant, (tl) => {
      tl.to(
        $("[data-dock]"),
        step >= STEP.DOCK
          ? { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }
          : { autoAlpha: 0, y: 40, duration: 0.4 },
        0,
      );
      clicks(tl, $("[data-dock]"), step >= STEP.DOCK && !out);
    });

    lanes.orbs.to(`${out}`, instant, (tl) => {
      tl.to($("[data-orb]"), { opacity: out ? 1 : 0, duration: 0.8 }, out ? 0.1 : 0);
    });
  };

  // ---- Projects: title, list, names, overview card ---------------------------
  const projectsText: Channel = (step, instant) => {
    // The title and the list stay until the Activity step; before that the
    // fold's scrub takes them out to the left.
    const titleOn = step >= STEP.ENTER && step < map.activity;
    const listOn = step >= STEP.LIST && step < map.activity;

    lanes.title.to(`${titleOn}`, instant, (tl) => {
      tl.to(
        $("[data-a2-rv]"),
        titleOn
          ? { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.7, ease: "power2.out" }
          : { autoAlpha: 0, y: 60, duration: 0.3 },
        0,
      );
    });

    lanes.list.to(`${listOn}${step < STEP.LIST}`, instant, (tl) => {
      tl.to(
        items,
        listOn
          ? { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.55, ease: "power2.out" }
          : step < STEP.LIST
            ? { autoAlpha: 0, y: 40, duration: 0.3 }
            : { autoAlpha: 0, duration: 0.2 },
        0,
      );
      clicks(tl, $("[data-p] button"), listOn);
    });

    const active = activeName(step, n);
    lanes.colors.to(`${active}`, instant, (tl) => {
      names.forEach((els, i) => {
        const color = i < active ? GREY : i === active ? VIOLET : undefined;
        els.forEach((el, k) => {
          tl.to(el, { color: color ?? rest[i][k], duration: 0.4 }, i === active ? 0.15 : 0);
        });
      });
    });

    // The overview card: one element, shown from the first unlock until the fold.
    const cardOn = step >= STEP.UNLOCK && step < map.fold;
    lanes.card.to(`${cardOn}`, instant, (tl) => {
      tl.to(
        $("[data-minic]"),
        cardOn
          ? { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" }
          : { autoAlpha: 0, scale: 0.86, y: 30, duration: 0.3 },
        cardOn ? 0.15 : 0,
      );
    });
  };

  // ---- The device ------------------------------------------------------------
  const device: Channel = (step, instant) => {
    const shown = step >= STEP.ENTER;
    const unlocked = step >= STEP.UNLOCK;

    // (The unfold itself is a camera move: it is scrubbed over 3-4 ticks, see
    // deviceTimeline.ts.)
    lanes.device.to(`${shown}${unlocked}`, instant, (tl) => {
      tl.to(rig, { show: shown ? 1 : 0, duration: shown ? 0.9 : 0.4, ease: "power2.out" }, 0.1)
        // The lock icon opens, then the lock screen slides up.
        .to(rig, { open: unlocked ? 1 : 0, duration: unlocked ? 0.9 : 0.5, ease: "power2.inOut" }, 0);
    });

    // The cover screen: the lock until the first unlock, then the Activity app
    // (never the lock again), then the socials.
    const social = step >= map.contact;
    const app = unlocked && !social;
    lanes.cover.to(`${unlocked}${social}`, instant, (tl) => {
      tl.to(rig, { lock: unlocked ? 0 : 1, duration: 0.35 }, 0)
        .to(rig, { app: app ? 1 : 0, duration: 0.45 }, social ? 0 : 0.1)
        .to(rig, { social: social ? 1 : 0, duration: 0.45 }, social ? 0.3 : 0)
        .to(rig, { apps: social ? 1 : 0, duration: social ? 0.8 : 0.3 }, social ? 0.35 : 0);
    });
  };

  // ---- The inner screen ------------------------------------------------------
  const screen: Channel = (step, instant) => {
    const current = step < STEP.UNLOCK ? -1 : Math.min(step - STEP.UNLOCK, n - 1);
    // The poster: the lock screen until the first unlock, then the project's.
    const target = current < 0 ? LOCK_TEXTURE : current;

    lanes.screen.to(`${target}`, instant, (tl) => {
      const visible = rig.trans > 0.5 ? rig.to : rig.from;
      if (instant || target >= n || visible >= n || visible === target) {
        tl.set(rig, { from: target, to: target, trans: 1 }, 0);
      } else {
        // A project's own transition (a slightly later start, so the set has run).
        tl.set(rig, { from: visible, to: target, trans: 0 }, 0.001).to(
          rig,
          { trans: 1, duration: 0.8, ease: "power1.inOut" },
          0.1,
        );
      }
    });

    // The live page: the current project's, but only once the poster's own
    // transition has finished (it ends 0.9 s in), so a poster still moving is
    // never blended with the page on top of it (that doubles the text).
    const page = Math.max(current, step >= STEP.FIRST ? 0 : -1);
    lanes.frames.to(`${page}`, instant, (tl) => {
      for (let i = 0; i < n; i++) {
        const on = i === page && live(i);
        tl.to(
          rig.frames,
          { [i]: on ? 1 : 0, duration: on ? 0.35 : 0.2 },
          on && step > STEP.UNLOCK ? 0.95 : 0,
        );
      }
    });
  };

  // ---- Activity and Contact --------------------------------------------------
  const activity: Channel = (step, instant) => {
    const reposOn = step >= map.activity && step < map.contact;
    lanes.repos.to(`${reposOn}`, instant, (tl) => {
      tl.to(
        $("[data-repos]"),
        reposOn
          ? { autoAlpha: 1, x: 0, duration: 0.8, ease: "power2.out" }
          : { autoAlpha: 0, x: 120, duration: 0.5, ease: "power2.in" },
        0,
      );
      clicks(tl, $("[data-repos]"), reposOn);
    });

    const contactOn = step >= map.contact;
    lanes.contact.to(`${contactOn}`, instant, (tl) => {
      tl.to(
        $("[data-a3c]"),
        contactOn
          ? { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }
          : { autoAlpha: 0, y: -20, duration: 0.3 },
        contactOn ? 0.3 : 0,
      ).to(
        $("[data-a3-foot]"),
        contactOn
          ? { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }
          : { autoAlpha: 0, y: 20, duration: 0.3 },
        contactOn ? 0.4 : 0,
      );
      clicks(tl, $("[data-a3-foot]"), contactOn);
    });
  };

  return {
    channels: [about, projectsText, device, screen, activity],
    kill: () => Object.values(lanes).forEach((lane) => lane.kill()),
  };
}
