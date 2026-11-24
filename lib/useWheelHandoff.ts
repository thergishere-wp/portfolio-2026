"use client";

import { useEffect, type RefObject } from "react";

/**
 * An element that scrolls on its own inside the pinned page (the repositories
 * list, the phone's Summary) must not trap the wheel. Lenis ignores any
 * element carrying `data-lenis-prevent`, so the attribute is only present
 * while the element can actually scroll in the wheel's direction: when it
 * does not overflow, or it is at its top/bottom edge, the wheel falls through
 * to Lenis and the page moves on.
 *
 * The listener runs in the capture phase, before Lenis reads the event.
 */
export function useWheelHandoff(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent): void => {
      const room = el.scrollHeight - el.clientHeight;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop >= room - 1;
      const keep =
        room > 1 && (event.deltaY > 0 ? !atBottom : event.deltaY < 0 ? !atTop : false);
      if (keep) el.setAttribute("data-lenis-prevent", "");
      else el.removeAttribute("data-lenis-prevent");
    };
    el.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [ref]);
}
