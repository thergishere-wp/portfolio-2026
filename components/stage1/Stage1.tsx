"use client";

import { useRef, useState } from "react";
import { RgMark } from "@/components/chrome/RgMark";
import { projects } from "@/content/projects";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { stage1Rests } from "@/lib/scroll-budget";
import { registerScrollTarget } from "@/lib/scroll-targets";
import { registerSnapSource } from "@/lib/snap-points";
import { StepSequencer } from "@/lib/step-sequencer";
import { useStageLayout } from "@/lib/useStageLayout";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import { buildAboutTimeline } from "./aboutTimeline";
import { Imac } from "./Imac";
import { ImacScreen } from "./ImacScreen";
import { MenuBar } from "./MenuBar";
import { AboutPanel } from "./about/AboutPanel";
import { EducationPanel } from "./about/EducationPanel";
import { JourneyPanel } from "./about/JourneyPanel";
import { NowPanel } from "./about/NowPanel";
import { ToolkitPanel } from "./about/ToolkitPanel";
import { Desktop } from "./desktop/Desktop";
import { ProjectsAct } from "./projects/ProjectsAct";
import { ProjectsStatic } from "./projects/ProjectsStatic";
import {
  appendProjectsSteps,
  progressAt,
  type ProjectsProgress,
} from "./projects/projectsTimeline";
import styles from "./Stage1.module.css";

const Panels = () => (
  <>
    <AboutPanel />
    <EducationPanel />
    <JourneyPanel />
    <NowPanel />
    <ToolkitPanel />
  </>
);

/** The pinned iMac story: the About desktop with its dock, then Projects. */
function AnimatedStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const imacRef = useRef<HTMLDivElement>(null);
  const { layout, layoutRef } = useStageLayout(imacRef);
  // The project the timeline has revealed (-1 while locked) and whether the
  // projects act is near enough for its previews to start loading.
  const [progress, setProgress] = useState<ProjectsProgress>({
    current: -1,
    near: false,
  });

  useGSAP(
    () => {
      const section = sectionRef.current;
      const imac = imacRef.current;
      if (!section || !imac) return;

      // Camera moves are scrubbed; every reveal is a step (see StepSequencer).
      const rests = stage1Rests(projects.length);
      const parts = buildAboutTimeline({
        section,
        imac,
        layoutRef,
        length: rests[rests.length - 1],
      });
      appendProjectsSteps(section, parts.steps);
      const { timeline, steps } = parts;

      const startOf = (): number => timeline.scrollTrigger?.start ?? 0;
      const px = (vh: number): number => startOf() + vh * window.innerHeight;
      const thresholds = (): number[] => steps.map((s) => px(s.at));

      let nearSeen = false;
      const sequencer = new StepSequencer(steps, (index) => {
        const next = progressAt(index);
        nearSeen ||= next.near;
        setProgress({ current: next.current, near: nearSeen });
      });
      const evaluate = (scroll: number, instant: boolean): void => {
        const target = StepSequencer.indexAt(scroll, thresholds());
        if (instant) sequencer.sync(target);
        else sequencer.goTo(target);
      };

      // Follows the scroll everywhere (also before and after the pin), so the
      // step state is always a function of the scroll position.
      const follower = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => evaluate(self.scroll(), false),
        onRefresh: (self) => evaluate(self.scroll(), true),
      });

      // The labels the side nav jumps to: the About desktop and the Projects title.
      timeline.addLabel("work", rests[3]);
      const offAbout = registerScrollTarget("about", timeline, "about");
      const offWork = registerScrollTarget("work", timeline, "work");
      const offSnap = registerSnapSource(() => rests.map(px));
      return () => {
        follower.kill();
        sequencer.kill();
        offAbout();
        offWork();
        offSnap();
      };
    },
    { scope: sectionRef, dependencies: [] },
  );

  return (
    <section
      id="stage1"
      ref={sectionRef}
      className={styles.stage}
      aria-label="About and projects"
    >
      <Imac ref={imacRef} layout={layout}>
        <ImacScreen>
          <div className={styles.desk}>
            <RgMark
              className={styles.deskMark}
              aria-hidden="true"
              data-screen-mark
            />
          </div>
          <MenuBar />
          <Desktop />
        </ImacScreen>
      </Imac>
      <ProjectsAct current={progress.current} near={progress.near} />
    </section>
  );
}

/** Reduced motion: every panel as a plain, static section. */
function StaticStage() {
  return (
    <section
      id="stage1"
      className={styles.static}
      aria-label="About and projects"
    >
      <Panels />
      <ProjectsStatic />
    </section>
  );
}

export function Stage1() {
  const reduced = usePrefersReducedMotion();
  return reduced ? <StaticStage /> : <AnimatedStage />;
}
