"use client";

import { useRef, useState } from "react";
import { RgMark } from "@/components/chrome/RgMark";
import { useGSAP } from "@/lib/gsap";
import { registerScrollTarget } from "@/lib/scroll-targets";
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
import { ProjectsAct } from "./projects/ProjectsAct";
import { ProjectsStatic } from "./projects/ProjectsStatic";
import {
  appendProjectsAct,
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

/** The pinned iMac story: About, Education, Journey, Right now, Toolkit. */
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

      const { timeline, endTime } = buildAboutTimeline({
        section,
        imac,
        layoutRef,
      });
      appendProjectsAct({
        timeline,
        section,
        startTime: endTime,
        onProgress: setProgress,
      });

      const offAbout = registerScrollTarget("about", timeline, "about");
      const offWork = registerScrollTarget("work", timeline, "work");
      return () => {
        offAbout();
        offWork();
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
          <div className={styles.track} data-track>
            <Panels />
          </div>
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
