"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { RgMark } from "@/components/chrome/RgMark";
import { projects } from "@/content/projects";
import { createFoldRig, type FoldRig } from "@/lib/fold-rig";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useIntroState } from "@/lib/intro-state";
import { stage1Rests } from "@/lib/scroll-budget";
import { registerScrollTarget } from "@/lib/scroll-targets";
import { useLenis } from "@/lib/smooth-scroll";
import { registerSnapSource } from "@/lib/snap-points";
import { StepSequencer } from "@/lib/step-sequencer";
import { useNear } from "@/lib/useNear";
import { useStageLayout } from "@/lib/useStageLayout";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import { hasWebGL, whenIdle } from "@/lib/webgl";
import { loadFoldTextures } from "../story/fold-screen";
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
import { ProjectViewer } from "./projects/ProjectViewer";
import {
  appendProjectsSteps,
  FIRST_PROJECT_STEP,
  progressAt,
  type ProjectsProgress,
} from "./projects/projectsTimeline";
import styles from "./Stage1.module.css";

declare global {
  interface Window {
    /** Set by `?debug` (see AnimatedStage). */
    __foldRig?: FoldRig;
  }
}

// The one WebGL scene. It is fetched when the intro is done and the browser is
// idle, and it is never unmounted by scrolling.
const StoryCanvas = dynamic(() => import("../story/StoryCanvas"), { ssr: false });

const Panels = () => (
  <>
    <AboutPanel />
    <EducationPanel />
    <JourneyPanel />
    <NowPanel />
    <ToolkitPanel />
  </>
);

interface ViewerState {
  project: (typeof projects)[number];
  from: DOMRect;
}

/** The pinned iMac story: the About desktop with its dock, then Projects. */
function AnimatedStage({ onUnsupported }: { onUnsupported: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imacRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement | null>(null);
  const jumpRef = useRef<(index: number) => void>(() => undefined);
  const { layout, layoutRef } = useStageLayout(imacRef);
  const [rig] = useState(createFoldRig);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  const intro = useIntroState();
  const inView = useNear(sectionRef, "300px 0px", false);

  // The project the steps have unlocked (-1 while locked), whether previews
  // may load, and whether the device has been shown.
  const [progress, setProgress] = useState<ProjectsProgress>({
    current: -1,
    near: false,
    deviceShown: false,
  });
  // `?debug` exposes the rig so a script can freeze any pose or transition.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__foldRig = rig;
    }
  }, [rig]);

  const [canvasOn, setCanvasOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  // Once the intro is done and the browser is idle: check WebGL, preload the
  // textures, then mount the canvas. It stays mounted for good.
  useEffect(() => {
    if (!intro.unlocked || canvasOn) return;
    return whenIdle(() => {
      if (!hasWebGL()) {
        onUnsupported();
        return;
      }
      void loadFoldTextures();
      setCanvasOn(true);
    });
  }, [intro.unlocked, canvasOn, onUnsupported]);

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
      appendProjectsSteps(section, parts.steps, rig);
      const { timeline, steps } = parts;

      const startOf = (): number => timeline.scrollTrigger?.start ?? 0;
      const px = (vh: number): number => startOf() + vh * window.innerHeight;
      const thresholds = (): number[] => steps.map((s) => px(s.at));

      let nearSeen = false;
      const sequencer = new StepSequencer(steps, (index) => {
        const next = progressAt(index);
        nearSeen ||= next.near;
        setProgress({ ...next, near: nearSeen });
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

      // Clicking a project's name scrolls straight to its step.
      jumpRef.current = (index) => {
        const y = px(rests[FIRST_PROJECT_STEP + index]);
        const instance = lenisRef.current;
        if (instance) instance.scrollTo(y, { duration: 1.1 });
        else window.scrollTo({ top: y });
      };

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

  const selectProject = useCallback((index: number) => jumpRef.current(index), []);

  const unlocked = progress.current;
  const openProject = useCallback(
    (rect: DOMRect, element: HTMLElement) => {
      const project = projects[unlocked];
      if (!project) return;
      screenRef.current = element;
      setViewer({ project, from: rect });
    },
    [unlocked],
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
      <div ref={canvasWrapRef} className={styles.canvasWrap}>
        {canvasOn ? (
          <StoryCanvas
            rig={rig}
            portal={canvasWrapRef}
            active={progress.near && inView}
            current={progress.current}
            near={progress.near}
            onOpenProject={openProject}
            onReady={() => setReady(true)}
            onContext={setContextLost}
          />
        ) : null}
        {progress.deviceShown && (!ready || contextLost) ? (
          <div className={styles.silhouette} aria-hidden="true" />
        ) : null}
      </div>
      <ProjectsAct current={progress.current} onSelect={selectProject} />
      {viewer ? (
        <ProjectViewer
          project={viewer.project}
          from={viewer.from}
          windowRef={screenRef}
          onClosed={() => setViewer(null)}
        />
      ) : null}
    </section>
  );
}

/** Reduced motion, or no WebGL: every panel as a plain, static section. */
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
  const [noWebGL, setNoWebGL] = useState(false);
  const markUnsupported = useCallback(() => setNoWebGL(true), []);
  return reduced || noWebGL ? (
    <StaticStage />
  ) : (
    <AnimatedStage onUnsupported={markUnsupported} />
  );
}
