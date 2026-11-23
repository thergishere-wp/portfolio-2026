import { gsap } from "@/lib/gsap";
import type { StageLayout } from "@/lib/stage-layout";

interface AboutTimelineParts {
  section: HTMLElement;
  imac: HTMLElement;
  layoutRef: { readonly current: StageLayout };
}

/** Panels the screen scrolls through after About, in order. */
const PANELS = ["edu", "jour", "now", "kit"] as const;

/**
 * The pinned, scrubbed Stage 1 timeline (timings are the prototype's):
 *  1. zoom into the display, RG blurs out, menu bar and About come in
 *  2. scroll inside the screen through five panels
 *  3. zoom out to the back of the room, the screen returns to a faint RG
 * Every size-dependent value is a function, re-read on refresh.
 */
export function buildAboutTimeline({
  section,
  imac,
  layoutRef,
}: AboutTimelineParts): gsap.core.Timeline {
  const $ = gsap.utils.selector(section);
  const out = { opacity: 1, y: 0, ease: "power2.out" };

  const tl: gsap.core.Timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * tl.duration() * 0.6,
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
      $('[data-panel="about"] [data-rv]'),
      { opacity: 0, y: 50 },
      { ...out, stagger: 0.07, duration: 0.5 },
      0.85,
    )
    .fromTo(
      $("[data-rv-win]"),
      { opacity: 0, y: 90, rotateX: -14, scale: 0.95 },
      { ...out, rotateX: 0, scale: 1, duration: 0.7 },
      0.95,
    )
    .addLabel("about", 1.6);

  let t = 2.2;
  PANELS.forEach((id, i) => {
    tl.to(
      $("[data-track]"),
      {
        y: () => -window.innerHeight * (i + 1),
        duration: 1,
        ease: "power2.inOut",
      },
      t,
    ).fromTo(
      $(`[data-panel="${id}"] [data-rv]`),
      { opacity: 0, y: 60 },
      { ...out, stagger: 0.05, duration: 0.55 },
      t + 0.35,
    );
    t += 1.55;
  });

  tl.to($("[data-track], [data-menubar]"), { opacity: 0, duration: 0.5 }, t)
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

  return tl;
}
