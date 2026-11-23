"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RgMark } from "@/components/chrome/RgMark";
import { projects } from "@/content/projects";
import { contact } from "@/content/socials";
import { cn } from "@/lib/cn";
import { createFoldRig, holdStill, type FoldRig } from "@/lib/fold-rig";
import { startGithubPolling, useGithub } from "@/lib/github-store";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useIntroState } from "@/lib/intro-state";
import { storyRests } from "@/lib/scroll-budget";
import { registerScrollTarget } from "@/lib/scroll-targets";
import { useLenis } from "@/lib/smooth-scroll";
import { registerSnapSource } from "@/lib/snap-points";
import { StepSequencer } from "@/lib/step-sequencer";
import { useNear } from "@/lib/useNear";
import { useStageLayout } from "@/lib/useStageLayout";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import { hasWebGL, whenIdle } from "@/lib/webgl";
import { ReposWindow } from "../stage3/ReposWindow";
import { Stage3Static } from "../stage3/Stage3Static";
import stage3Styles from "../stage3/Stage3.module.css";
import { loadFoldTextures } from "../story/fold-screen";
import { buildAboutTimeline } from "./aboutTimeline";
import { appendDeviceTimeline } from "./deviceTimeline";
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
    __foldState?: { canvasOn: boolean; ready: boolean; contextLost: boolean };
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

/**
 * The whole pinned story, one section and one pin (so there is no pin-spacing
 * handoff to jump at): the iMac's About desktop, Projects, then Activity and
 * Contact on the same foldable device and the same canvas.
 */
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
  const { repos, unreachable } = useGithub();

  // The project the steps have unlocked (-1 while locked), whether previews
  // may load, and whether the device has been shown.
  const [progress, setProgress] = useState<ProjectsProgress>({
    current: -1,
    near: false,
    deviceShown: false,
  });
  const [canvasOn, setCanvasOn] = useState(false);
  const [ready, setReady] = useState(false);
  // Keep rendering for a moment once the real model is up, so its shaders
  // compile and its first frames are drawn while it is still hidden.
  const [warm, setWarm] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (!warm) return;
    const id = window.setTimeout(() => setWarm(false), 2000);
    return () => window.clearTimeout(id);
  }, [warm]);

  // `?debug` also exposes the scene's state, for the reliability test.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__foldState = { canvasOn, ready, contextLost };
    }
  }, [canvasOn, ready, contextLost]);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  // `?debug` exposes the rig so a script can freeze any pose or transition.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debug")) window.__foldRig = rig;
    // `?still` freezes the device's idle float, for the continuity test.
    if (params.has("still")) holdStill(rig);
  }, [rig]);

  // Start polling GitHub once the story is under way, not on page load.
  useEffect(() => (progress.near ? startGithubPolling() : undefined), [progress.near]);

  // Once the intro is done and the browser is idle: check WebGL, preload the
  // textures, then mount the canvas. It stays mounted for good.
  useEffect(() => {
    if (!intro.unlocked || canvasOn) return;
    return whenIdle(() => {
      if (!hasWebGL()) {
        onUnsupported();
        return;
      }
      // Everything the scene needs, during idle time long before Projects:
      // the textures, the scene's code, then the canvas itself.
      void loadFoldTextures();
      void import("../story/StoryCanvas");
      setCanvasOn(true);
    });
  }, [intro.unlocked, canvasOn, onUnsupported]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const imac = imacRef.current;
      if (!section || !imac) return;

      // Camera moves are scrubbed; every reveal is a step (see StepSequencer).
      const rests = storyRests(projects.length);
      const parts = buildAboutTimeline({
        section,
        imac,
        layoutRef,
        length: rests[rests.length - 1],
      });
      const projectsEnd = appendProjectsSteps(section, parts.steps, rig);
      appendDeviceTimeline({
        timeline: parts.timeline,
        section,
        imac,
        rig,
        steps: parts.steps,
        start: projectsEnd,
      });
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

      // The labels the side nav jumps to.
      timeline.addLabel("work", rests[3]);
      const offs = [
        registerScrollTarget("about", timeline, "about"),
        registerScrollTarget("work", timeline, "work"),
        registerScrollTarget("activity", timeline, "activity"),
        registerScrollTarget("contact", timeline, "contact"),
        registerSnapSource(() => rests.map(px)),
      ];
      return () => {
        follower.kill();
        sequencer.kill();
        offs.forEach((off) => off());
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
      aria-label="About, projects, activity and contact"
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
            // Render while the model is not up yet (its first frame announces
            // it), then for a moment to warm the shaders, then only while the
            // story is on screen and near the device.
            active={!ready || warm || (progress.near && inView)}
            current={progress.current}
            near={progress.near}
            onOpenProject={openProject}
            onReady={() => {
              setReady(true);
              setWarm(true);
            }}
            onContext={setContextLost}
          />
        ) : null}
        {progress.deviceShown && (!ready || contextLost) ? (
          <div className={styles.silhouette} aria-hidden="true" />
        ) : null}
      </div>
      <ProjectsAct current={progress.current} onSelect={selectProject} />
      <div className={stage3Styles.copy} data-a3c>
        <p className={cn("eyebrow", stage3Styles.copyEyebrow)}>{contact.eyebrow}</p>
        <h2>
          {contact.titleLead} <em>{contact.titleEmphasis}</em>
        </h2>
      </div>
      <ReposWindow repos={repos ? repos.repos : null} unreachable={unreachable} />
      <p className={stage3Styles.foot} data-a3-foot>
        {contact.emailLead} <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </p>
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
    <>
      <section
        id="stage1"
        className={styles.static}
        aria-label="About and projects"
      >
        <Panels />
        <ProjectsStatic />
      </section>
      <Stage3Static />
    </>
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
