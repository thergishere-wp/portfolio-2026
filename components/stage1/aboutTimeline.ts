import { gsap } from "@/lib/gsap";
import { BUDGET } from "@/lib/scroll-budget";
import type { StageLayout } from "@/lib/stage-layout";

interface CameraTimelineParts {
  section: HTMLElement;
  imac: HTMLElement;
  layoutRef: { readonly current: StageLayout };
  /** Total scroll length of the pinned story, in viewport heights. */
  length: number;
}

/**
 * The story's scrubbed timeline and its first camera moves: the iMac zooms
 * into the display, then back out to the rear of the room. It moves only
 * cameras; every content change is a step (see storySteps.ts). Every
 * size-dependent value is a function, re-read on refresh.
 */
export function buildCameraTimeline({
  section,
  imac,
  layoutRef,
  length,
}: CameraTimelineParts): gsap.core.Timeline {
  const $ = gsap.utils.selector(section);

  const tl: gsap.core.Timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * tl.duration(),
      // Scrubbed to the scroll exactly: Lenis already smooths, and any extra
      // lag here would make a frame depend on how fast it was reached.
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Camera: zoom into the display.
  const zoomEnd = BUDGET.zoomIn;
  tl.to(
    imac,
    {
      scale: () => layoutRef.current.zoomScale,
      y: () => layoutRef.current.zoomY,
      duration: zoomEnd,
      ease: "power2.inOut",
    },
    0,
  )
    .to($("[data-screen]"), { borderRadius: 0, duration: 0.3 }, zoomEnd - 0.3)
    .to($("[data-glare]"), { opacity: 0, duration: 0.4 }, 0.2);

  // Camera: zoom out to the back of the room, after the desktop stop.
  const outStart = BUDGET.zoomIn + BUDGET.aboutStop;
  tl.to(
    imac,
    {
      scale: () => layoutRef.current.bgScale,
      y: () => layoutRef.current.bgY,
      opacity: 0.3,
      filter: "blur(6px)",
      duration: BUDGET.zoomOut,
      ease: "power2.inOut",
    },
    outStart,
  ).to($("[data-screen]"), { borderRadius: 3, duration: 0.2 }, outStart + 0.2);

  tl.addLabel("about", outStart);

  // A zero-length tween at the end gives the timeline its full length.
  tl.to({}, { duration: 0 }, length);
  return tl;
}
