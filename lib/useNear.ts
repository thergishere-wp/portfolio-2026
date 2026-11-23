"use client";

import { useEffect, useState, type RefObject } from "react";

/** Whether `ref` is within `margin` of the viewport. With `latch`, stays true once seen. */
export function useNear(
  ref: RefObject<Element | null>,
  margin: string,
  latch: boolean,
): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear((prev) => (latch && prev ? true : entry.isIntersecting)),
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, latch]);
  return near;
}
