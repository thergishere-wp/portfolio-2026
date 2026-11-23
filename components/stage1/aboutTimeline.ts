import { gsap } from "@/lib/gsap";
import type { StageLayout } from "@/lib/stage-layout";

interface AboutTimelineParts {
  section: HTMLElement;
  imac: HTMLElement;
  layoutRef: { readonly current: StageLayout };
}

/** Pixels of scroll per timeline unit, as a fraction of the viewport height. */
const SCROLL_PER_UNIT = 0.6;
/**
 * Timeline units the desktop stays pinned for: about one viewport of scroll
 * (1 / SCROLL_PER_UNIT), long enough to open the apps in the dock.
 */
const DESKTOP_HOLD = 1.7;

/**
 * The pinned, scrubbed Stage 1 timeline (timings are the prototype's, except
 * the old five-panel scroll track, which is now a single desktop stop):
 *  1. zoom into the display, RG blurs out, menu bar, About window and dock
 *     come in
 *  2. hold on the desktop for about one viewport of scroll
 *  3. zoom out to the back of the room, the screen returns to a faint RG
 * Every size-dependent value is a function, re-read on refresh.
 */
export function buildAboutTimeline({
  section,
  imac,
  layoutRef,
}: AboutTimelineParts): { timeline: gsap.core.Timeline; endTime: number } {
  const $ = gsap.utils.selector(section);
  const out = { opacity: 1, y: 0, ease: "power2.out" };

  const tl: gsap.core.Timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * tl.duration() * SCROLL_PER_UNIT,
      scrub: 1,
      pin: true,
      invalidateOnRefresh: true,
    },
  });

  tl.to(
    imac,
    {
      scale: () => layoutRef.current.zoomScale,
      y: () => layoutRef.current.zoomY,
      duration: 1.2,
      ease: "power2.inOut",
    },
    0,
  )
    .to($("[data-screen]"), { borderRadius: 0, duration: 0.4 }, 1.1)
    .to($("[data-glare]"), { opacity: 0, duration: 0.6 }, 0.6)
    .to(
      $("[data-screen-mark]"),
      { opacity: 0, scale: 0.86, filter: "blur(10px)", duration: 0.5 },
      0.6,
    )
    .fromTo(
      $("[data-menubar]"),
      { opacity: 0, y: -12 },
      { ...out, duration: 0.4 },
      0.85,
    )
    .fromTo(
      $("[data-about-window]"),
      { autoAlpha: 0, y: 70, scale: 0.96 },
      { ...out, autoAlpha: 1, scale: 1, duration: 0.7 },
      0.85,
    )
    .fromTo(
      $('[data-panel="about"] [data-rv], [data-rv-win]'),
      { opacity: 0, y: 40 },
      { ...out, stagger: 0.07, duration: 0.5 },
      1.0,
    )
    .fromTo(
      $("[data-dock]"),
      { autoAlpha: 0, y: 40 },
      { ...out, autoAlpha: 1, duration: 0.6 },
      1.3,
    )
    .addLabel("about", 1.6);

  // One short stop on the desktop: the scroll does nothing here but pass time.
  const t = 1.6 + DESKTOP_HOLD;

  tl.to(
    $("[data-desktop], [data-menubar]"),
    { autoAlpha: 0, duration: 0.5 },
    t,
  )
    .to(
      $("[data-screen-mark]"),
      { opacity: 0.35, scale: 1, filter: "blur(4px)", duration: 0.5 },
      t + 0.35,
    )
    .to($("[data-screen]"), { borderRadius: 3, duration: 0.3 }, t + 0.5)
    .to(
      imac,
      {
        scale: () => layoutRef.current.bgScale,
        y: () => layoutRef.current.bgY,
        opacity: 0.3,
        filter: "blur(6px)",
        duration: 1.5,
        ease: "power2.inOut",
      },
      t,
    );

  // The projects act continues from here.
  return { timeline: tl, endTime: t };
}
