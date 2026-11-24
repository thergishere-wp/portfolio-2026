"use client";

import { Suspense, use, useRef, type RefObject } from "react";
import { BackSide, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { FOLD, projectsPxPerUnit, type FoldRig } from "@/lib/fold-rig";
import { FoldModel } from "./FoldModel";
import { loadFoldTextures } from "./fold-screen";

/** A soft studio built from light panels, so nothing is fetched at runtime. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <mesh scale={40}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#cdc8c0" side={BackSide} toneMapped={false} />
      </mesh>
      <Lightformer form="rect" intensity={2.4} position={[0, 6, 3]} scale={[12, 5, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.6} position={[-6, 1, 3]} scale={[2.5, 9, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.6} position={[6, 1, 3]} scale={[2.5, 9, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="rect" intensity={1} position={[0, 0, 8]} scale={[10, 6, 1]} rotation-y={Math.PI} />
      <Lightformer form="rect" intensity={0.8} position={[0, -5, 2]} scale={[12, 3, 1]} rotation-x={-Math.PI / 2} />
    </Environment>
  );
}

/** What stands in for the device while its textures load: a plain dark slab. */
function Silhouette() {
  return (
    <mesh position={[FOLD.w / 4, 0, FOLD.d / 2]}>
      <boxGeometry args={[FOLD.w, FOLD.h, FOLD.d * 2]} />
      <meshStandardMaterial color="#2c2c31" roughness={0.6} metalness={0.4} />
    </mesh>
  );
}

const easeOutBack = (x: number): number => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

interface DeviceProps {
  rig: FoldRig;
  portal: RefObject<HTMLElement | null>;
  current: number;
  near: boolean;
  onOpenProject: (rect: DOMRect, element: HTMLElement) => void;
  onReady: () => void;
}

/** Loads the textures (suspends until they are there), then the model. */
function Loaded({ rig, portal, current, near, onOpenProject, onReady }: DeviceProps) {
  const textures = use(loadFoldTextures());
  const announced = useRef(false);
  useFrame(() => {
    if (announced.current) return;
    announced.current = true;
    onReady();
  });
  return (
    <FoldModel
      rig={rig}
      portal={portal}
      textures={textures}
      current={current}
      near={near}
      onOpenProject={onOpenProject}
    />
  );
}

/**
 * Applies the rig every frame: position and size follow the visible area, so
 * the device keeps its proportions at any window size.
 */
function Device(props: DeviceProps) {
  const { rig } = props;
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const shadow = useRef<Group>(null);

  useFrame(({ viewport, size, clock }) => {
    const o = outer.current;
    const i = inner.current;
    const s = shadow.current;
    if (!o || !i || !s) return;

    // World units per CSS pixel, to size the device as a share of the window.
    const unitsPerPx = viewport.height / size.height;
    const base = projectsPxPerUnit(size.width, size.height) * unitsPerPx * rig.scale;
    const shown = easeOutBack(Math.min(1, Math.max(0, rig.show)));
    const bob =
      Math.sin(clock.elapsedTime * 1.1) * 0.006 * viewport.height * (1 - rig.shut) * rig.bob;

    // Never hidden: while the device is not shown it is scaled to nothing, so
    // the shaders still compile on the first frame, long before Projects.
    o.position.set(
      rig.x * viewport.width,
      rig.y * viewport.height + bob - (1 - rig.show) * 0.05 * viewport.height,
      0,
    );
    i.scale.setScalar(Math.max(0.0001, base * shown));
    i.rotation.set(rig.rx, rig.ry + rig.turn, rig.rz);

    // The floor sits under the device's resting bottom edge.
    s.position.y = -(FOLD.h * base) / 2 - 0.02;
    const plane = s.getObjectByProperty("isMesh", true) as Mesh | undefined;
    if (plane) (plane.material as MeshBasicMaterial).opacity = rig.shadow;
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Suspense fallback={<Silhouette />}>
          <Loaded {...props} />
        </Suspense>
      </group>
      <group ref={shadow}>
        <ContactShadows
          opacity={1}
          scale={[7, 7]}
          blur={2.6}
          far={4.5}
          resolution={512}
          color="#2a2118"
          frames={Infinity}
        />
      </group>
    </group>
  );
}

interface StoryCanvasProps extends Omit<DeviceProps, "onReady"> {
  /** Render only while the device can be on screen. */
  active: boolean;
  /** The first frame has been drawn with the real model. */
  onReady: () => void;
  /** The WebGL context was lost or came back. */
  onContext: (lost: boolean) => void;
}

/**
 * The page's one WebGL scene. It is mounted once, when the intro is done, and
 * never unmounted by scrolling in either direction: the device is hidden by
 * the rig, not by removing the canvas.
 */
export default function StoryCanvas({ active, onContext, ...device }: StoryCanvasProps) {
  return (
    <Canvas
      // R3F's wrapper div defaults to pointer-events: auto and would sit over
      // the whole stage (the About dock, the phone tabs); the canvas only
      // draws, the DOM screens take the clicks.
      style={{ pointerEvents: "none" }}
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 8], near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true }}
      frameloop={active ? "always" : "never"}
      onCreated={({ gl, scene, invalidate }) => {
        // `?debug` exposes the renderer and scene (the triangle count in the report).
        if (new URLSearchParams(window.location.search).has("debug")) {
          Reflect.set(window, "__foldGL", gl);
          Reflect.set(window, "__foldScene", scene);
        }
        const el = gl.domElement;
        el.addEventListener("webglcontextlost", (event) => {
          // Lets the browser restore the context instead of discarding it.
          event.preventDefault();
          onContext(true);
        });
        el.addEventListener("webglcontextrestored", () => {
          onContext(false);
          invalidate();
        });
      }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 6]} intensity={1.1} />
      <Studio />
      <Device {...device} />
    </Canvas>
  );
}
