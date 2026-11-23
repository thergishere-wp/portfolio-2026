import { gsap } from "@/lib/gsap";

interface ProjectsTimelineParts {
  /** The Stage 1 timeline to extend. */
  timeline: gsap.core.Timeline;
  section: HTMLElement;
  /** Where the About act ended. */
  startTime: number;
  /** Called when the revealed project changes (-1 while locked). */
  onCurrentChange: (index: number) => void;
}

/**
 * Appends the projects act (timings are the prototype's). For each project,
 * in order:
 *  - its name rises in black; the previous name greys out, and the previous
 *    preview and card leave
 *  - the lock resets, then the name turns violet; the shackle lifts and swings
 *    open and the lock fades
 *  - the preview fades in and the overview card pops in
 * Adds the "work" label for the side nav.
 */
export function appendProjectsAct({
  timeline: tl,
  section,
  startTime,
  onCurrentChange,
}: ProjectsTimelineParts): void {
  const $ = gsap.utils.selector(section);
  const out = { opacity: 1, y: 0, ease: "power2.out" };

  const items = $<HTMLElement>("[data-p]");
  const screens = $<HTMLElement>("[data-preview]");
  const minis = $<HTMLElement>("[data-minic]");

  gsap.set([...screens, ...minis], { autoAlpha: 0 });

  let t = startTime + 1.3;
  tl.to($("[data-orb]"), { opacity: 1, duration: 0.9 }, t - 0.3)
    .fromTo(
      $("[data-a2-rv]"),
      { opacity: 0, y: 60 },
      { ...out, stagger: 0.1, duration: 0.8 },
      t,
    )
    .fromTo(
      $("[data-win]"),
      { autoAlpha: 0, y: 100, scale: 0.93 },
      { ...out, autoAlpha: 1, scale: 1, duration: 1 },
      t + 0.1,
    )
    .addLabel("work", t + 0.9);

  t += 1.2;
  const marks: number[] = [];

  items.forEach((item, i) => {
    const text = item.querySelectorAll("[data-ptext]");
    tl.to(item, { ...out, duration: 0.6 }, t);

    if (i > 0) {
      tl.to(
        items[i - 1].querySelectorAll("[data-ptext]"),
        { color: "#B4B0A9", duration: 0.4 },
        t + 0.3,
      )
        .to(screens[i - 1], { autoAlpha: 0, duration: 0.4 }, t + 0.2)
        .to(minis[i - 1], { autoAlpha: 0, y: 20, duration: 0.35 }, t + 0.1)
        .to($("[data-lock]"), { opacity: 1, scale: 1, duration: 0.3 }, t + 0.45)
        .to(
          $("[data-shackle]"),
          { rotation: 0, y: 0, svgOrigin: "16 11", duration: 0.25 },
          t + 0.45,
        );
    }

    const u = t + 0.7;
    tl.to(text, { color: "#5B3DF5", duration: 0.4 }, u)
      .to(
        $("[data-shackle]"),
        { y: -3.2, duration: 0.3, ease: "back.out(3)" },
        u + 0.15,
      )
      .to(
        $("[data-shackle]"),
        { rotation: -32, svgOrigin: "16 11", duration: 0.35, ease: "power2.out" },
        u + 0.45,
      )
      .to($("[data-lock]"), { opacity: 0, scale: 0.85, duration: 0.4 }, u + 0.85)
      .fromTo(
        screens[i],
        { autoAlpha: 0, scale: 1.04 },
        { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" },
        u + 0.9,
      );

    const reveal = screens[i].querySelectorAll("[data-reveal]");
    if (reveal.length) {
      tl.fromTo(
        reveal,
        { y: 26, opacity: 0 },
        { ...out, stagger: 0.07, duration: 0.55 },
        u + 1,
      );
    }

    tl.fromTo(
      minis[i],
      { autoAlpha: 0, scale: 0.86, y: 30 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" },
      u + 1.25,
    );

    marks.push(u + 0.9);
    t += 2.9;
  });

  tl.to({}, { duration: 0.5 }, t);

  // Tell React which project is revealed, only when it changes.
  let last = -1;
  tl.eventCallback("onUpdate", () => {
    const now = tl.time();
    let index = -1;
    marks.forEach((mark, i) => {
      if (now >= mark) index = i;
    });
    if (index !== last) {
      last = index;
      onCurrentChange(index);
    }
  });
}
