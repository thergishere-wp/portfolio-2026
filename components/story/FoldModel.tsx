"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  DoubleSide,
  MeshPhysicalMaterial,
  NoBlending,
  ShapeGeometry,
  type Group,
  type Texture,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import { FOLD, foldAngle, type FoldRig } from "@/lib/fold-rig";
import { measureScreen, roundedRectShape } from "../stage3/phone-geometry";
import { CoverScreen } from "./CoverScreen";
import { InnerScreen } from "./InnerScreen";
import {
  bodyGeometry,
  coverScreenGeometry,
  glassGeometry,
  innerCentreX,
  innerScreenGeometry,
  unionScreenGeometry,
} from "./fold-geometry";
import {
  createScreenMaterial,
  createScreenUniforms,
  LOCK_TEXTURE,
  type LockTexture,
  type ScreenUniforms,
} from "./fold-screen";

const HALF_D = FOLD.d / 2;
/** The inner screen's DOM overlay is laid out at the iframe's tablet viewport. */
export const INNER_PX_WIDTH = 1024;
/** The cover screen's DOM is laid out phone-wide. */
export const COVER_PX_WIDTH = 390;

/** Titanium-white metal, shared by every metal part. */
function createTitanium(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: "#dcd8cf",
    metalness: 0.9,
    roughness: 0.32,
    clearcoat: 0.18,
    envMapIntensity: 1.25,
  });
}

function createGlass(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: "#050506",
    metalness: 0.15,
    roughness: 0.07,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.5,
  });
}

/** The canvas sits above the cover's DOM (z-index 5) and lets clicks through. */
function layCanvasOverDom(el: HTMLElement): void {
  el.style.zIndex = "5";
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
}

/** Points the shared screen shader at the rig's current transition. */
function syncUniforms(u: ScreenUniforms, rig: FoldRig, textures: Texture[]): void {
  u.uA.value = textures[rig.from] ?? textures[0] ?? null;
  u.uB.value = textures[rig.to] ?? textures[0] ?? null;
  u.uP.value = rig.trans;
  // The lock screen (the last texture) has no transition of its own.
  u.uMode.value = rig.to >= LOCK_TEXTURE ? 0 : rig.to;
  // The crease shows only while the two halves lie flat.
  u.uFlat.value = rig.unfold * (1 - rig.shut);
}

interface FoldModelProps {
  rig: FoldRig;
  /** Where drei mounts the DOM screens (stable from the first render). */
  portal: RefObject<HTMLElement | null>;
  /** Each project's inner-screen texture, in project order. */
  textures: Texture[];
  /** The unlocked project (-1 while locked) and whether previews may load. */
  current: number;
  near: boolean;
  /** Called with the inner screen's on-screen rect (and element) when it is clicked. */
  onOpenProject: (rect: DOMRect, element: HTMLElement) => void;
}

/**
 * The foldable, built procedurally: two rounded titanium halves on a hinge,
 * thin bezels, an inner screen across both halves and an outer cover screen
 * on the right half. No logos. The right half folds forward about a pivot on
 * the screen plane, so the two screens end up face to face.
 */
export function FoldModel({
  rig,
  portal,
  textures,
  current,
  near,
  onOpenProject,
}: FoldModelProps) {
  const device = useRef<Group>(null);
  const hinge = useRef<Group>(null);
  const gl = useThree((state) => state.gl);

  // drei's blending <Html> puts the canvas above its DOM (z-index 5, no
  // pointer events), but any non-blending <Html> resets those styles when it
  // mounts: and the live-page overlay below is one. Effects run children
  // first, so this runs last and restores them (the cover DOM must sit behind
  // the canvas, hidden by the body; the overlay sits above it).
  useLayoutEffect(() => {
    layCanvasOverDom(gl.domElement);
  }, [gl]);

  const parts = useMemo(() => {
    const union = unionScreenGeometry();
    const cover = coverScreenGeometry();
    const uniforms = createScreenUniforms();
    return {
      titanium: createTitanium(),
      glass: createGlass(),
      bodyL: bodyGeometry(-1),
      bodyR: bodyGeometry(1),
      glassL: glassGeometry(-1),
      glassR: glassGeometry(1),
      innerL: innerScreenGeometry(-1),
      innerR: innerScreenGeometry(1),
      // The DOM screens are sized and clipped from these, not from numbers.
      innerMetrics: measureScreen(union, INNER_PX_WIDTH),
      coverMetrics: measureScreen(cover, COVER_PX_WIDTH),
      cover,
      uniforms,
      matL: createScreenMaterial(-1, uniforms, innerCentreX(-1)),
      matR: createScreenMaterial(1, uniforms, innerCentreX(1)),
      port: new ShapeGeometry(roundedRectShape(0.15, 0.034, 0.017), 16),
      tongue: new ShapeGeometry(roundedRectShape(0.11, 0.009, 0.0045), 8),
    };
  }, []);

  useFrame(() => {
    const angle = foldAngle(rig);
    // Hinge: the right half folds forward about the screen plane.
    if (hinge.current) hinge.current.rotation.y = -angle;
    // Folded, the slab sits left of the hinge: shift it to stay centred.
    if (device.current) device.current.position.x = (FOLD.w / 2) * (angle / Math.PI);

    syncUniforms(parts.uniforms, rig, textures);
    // The lock texture shows the time: redraw it when the minute changes.
    (textures[LOCK_TEXTURE] as LockTexture | undefined)?.redraw?.();
  });

  const bottomY = -FOLD.h / 2 - 0.0009;
  const grille = [0, 1, 2, 3].map((k) => 0.1 + k * 0.026);
  const lenses = [
    [-0.07, 0.07],
    [-0.07, -0.07],
    [0.07, 0],
  ] as const;

  return (
    <group ref={device}>
      {/* Left half */}
      <group position={[-FOLD.w / 2, 0, 0]}>
        <mesh geometry={parts.bodyL} material={parts.titanium} />
        {/* The back: a camera island on the outer face */}
        <group position={[-0.2, FOLD.h / 2 - 0.27, -HALF_D - 0.001]} rotation-y={Math.PI}>
          <RoundedBox
            args={[0.34, 0.34, 0.022]}
            radius={0.06}
            smoothness={3}
            position={[0, 0, 0.011]}
            material={parts.titanium}
          />
          {lenses.map(([x, y]) => (
            <group key={`${x}${y}`} position={[x, y, 0.024]} rotation-x={Math.PI / 2}>
              <mesh material={parts.titanium}>
                <cylinderGeometry args={[0.058, 0.058, 0.02, 32]} />
              </mesh>
              <mesh position={[0, 0.012, 0]} material={parts.glass}>
                <cylinderGeometry args={[0.042, 0.042, 0.01, 32]} />
              </mesh>
            </group>
          ))}
        </group>
        <mesh geometry={parts.glassL} material={parts.glass} position={[0, 0, HALF_D + 0.0006]} />
      </group>
      <mesh
        geometry={parts.innerL}
        material={parts.matL}
        position={[innerCentreX(-1), 0, HALF_D + 0.0016]}
      />

      {/* Hinge barrel */}
      <mesh material={parts.titanium}>
        <cylinderGeometry args={[HALF_D - 0.001, HALF_D - 0.001, FOLD.h - 0.04, 24]} />
      </mesh>

      {/* Right half, hinged about the screen plane at x = 0 */}
      <group position={[0, 0, HALF_D]}>
        <group ref={hinge}>
          <group position={[0, 0, -HALF_D]}>
            <group position={[FOLD.w / 2, 0, 0]}>
              <mesh geometry={parts.bodyR} material={parts.titanium} />
              <mesh geometry={parts.glassR} material={parts.glass} position={[0, 0, HALF_D + 0.0006]} />
              {/* The cover glass and screen on the outer face */}
              <group position={[0, 0, -HALF_D - 0.0006]} rotation-y={Math.PI}>
                <mesh geometry={parts.glassR} material={parts.glass} />
              </group>
              <group position={[0, 0, -HALF_D - 0.0016]} rotation-y={Math.PI}>
                <Html
                  transform
                  occlude="blending"
                  portal={portal as RefObject<HTMLElement>}
                  distanceFactor={parts.coverMetrics.distanceFactor}
                  zIndexRange={[10, 0]}
                  geometry={<primitive object={parts.cover} attach="geometry" />}
                  material={
                    <meshBasicMaterial
                      color="#000"
                      transparent
                      opacity={0}
                      blending={NoBlending}
                      side={DoubleSide}
                      toneMapped={false}
                    />
                  }
                >
                  <CoverScreen rig={rig} metrics={parts.coverMetrics} />
                </Html>
              </group>
              {/* Bottom edge: USB-C port and speaker holes */}
              <group position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
                <mesh geometry={parts.port}>
                  <meshStandardMaterial color="#040405" roughness={0.9} />
                </mesh>
                <mesh geometry={parts.tongue} position={[0, 0, 0.0004]}>
                  <meshStandardMaterial color="#4a4a50" metalness={0.8} roughness={0.35} />
                </mesh>
                {grille.flatMap((x) =>
                  [-x, x].map((gx) => (
                    <mesh key={gx} position={[gx, 0, 0.0002]}>
                      <circleGeometry args={[0.0085, 14]} />
                      <meshStandardMaterial color="#060607" roughness={0.9} />
                    </mesh>
                  )),
                )}
              </group>
              {/* Side buttons on the outer edge */}
              {[0.34, 0.1].map((y, i) => (
                <RoundedBox
                  key={y}
                  args={[0.014, i === 0 ? 0.2 : 0.1, 0.034]}
                  radius={0.005}
                  smoothness={2}
                  position={[FOLD.w / 2 + 0.002, y, 0]}
                  material={parts.titanium}
                />
              ))}
            </group>
            <mesh
              geometry={parts.innerR}
              material={parts.matR}
              position={[innerCentreX(1), 0, HALF_D + 0.0016]}
            />
          </group>
        </group>
      </group>

      {/* The live page, over the open inner screen */}
      <group position={[0, 0, HALF_D + 0.004]}>
        <Html
          transform
          // drei's wrapper defaults to pointer-events: auto and, now that the
          // page keeps rendering (opacity 0) while the device folds, would sit
          // over the cover's tabs. Only the open hit area takes clicks.
          pointerEvents="none"
          portal={portal as RefObject<HTMLElement>}
          distanceFactor={parts.innerMetrics.distanceFactor}
          zIndexRange={[40, 20]}
        >
          <InnerScreen
            rig={rig}
            metrics={parts.innerMetrics}
            current={current}
            near={near}
            onOpen={onOpenProject}
          />
        </Html>
      </group>
    </group>
  );
}
