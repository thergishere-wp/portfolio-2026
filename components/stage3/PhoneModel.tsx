"use client";

import { useMemo, type RefObject } from "react";
import { NoBlending, ShapeGeometry } from "three";
import { Html, RoundedBox } from "@react-three/drei";
import {
  HTML_DISTANCE_FACTOR,
  PHONE,
  SCREEN,
  type PhoneRig,
} from "@/lib/phone-rig";
import { createBodyGeometry, roundedRectShape } from "./phone-geometry";
import { PhoneScreen } from "./PhoneScreen";

const TITANIUM = "#d8d3ca";
const HALF_D = PHONE.d / 2;

/** Brushed titanium frame material, shared by every metal part. */
function Titanium() {
  return (
    <meshPhysicalMaterial
      color={TITANIUM}
      metalness={0.92}
      roughness={0.34}
      clearcoat={0.15}
      envMapIntensity={1.25}
    />
  );
}

/** One lens: metal ring, dark glass, a hint of reflection. */
function Lens({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, 0]} rotation-x={Math.PI / 2}>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.03, 48]} />
        <Titanium />
      </mesh>
      <mesh position={[0, 0.028, 0]}>
        <cylinderGeometry args={[0.058, 0.058, 0.012, 48]} />
        <meshPhysicalMaterial
          color="#08080b"
          metalness={0.3}
          roughness={0.05}
          clearcoat={1}
          envMapIntensity={1.6}
        />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.004, 32]} />
        <meshStandardMaterial color="#1b1b30" metalness={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * A modern iPhone-style phone, built procedurally (no model file): titanium
 * body, black glass front with a hole that shows the DOM screen, frosted back
 * with a camera bump, side buttons, and a USB-C port and speaker grilles on
 * the bottom edge. There is deliberately no logo.
 */
interface PhoneModelProps {
  rig: PhoneRig;
  /**
   * Where drei mounts the DOM screen. It must be stable from the first render:
   * if Html's target changes while mounting, it unmounts its React root
   * mid-render and the screen is lost.
   */
  portal: RefObject<HTMLElement | null>;
}

export function PhoneModel({ rig, portal }: PhoneModelProps) {
  const parts = useMemo(
    () => ({
      body: createBodyGeometry(),
      frontGlass: new ShapeGeometry(
        roundedRectShape(PHONE.w - 0.056, PHONE.h - 0.056, PHONE.r - 0.028),
        48,
      ),
      screenHole: new ShapeGeometry(
        roundedRectShape(SCREEN.w, SCREEN.h, SCREEN.r),
        48,
      ),
      backGlass: new ShapeGeometry(
        roundedRectShape(PHONE.w - 0.056, PHONE.h - 0.056, PHONE.r - 0.028),
        48,
      ),
      port: new ShapeGeometry(roundedRectShape(0.17, 0.046, 0.023), 24),
      portTongue: new ShapeGeometry(roundedRectShape(0.125, 0.011, 0.0055), 12),
    }),
    [],
  );

  const bottomY = -PHONE.h / 2 - 0.0009;
  // Speaker grille holes either side of the port.
  const grille = [0, 1, 2, 3, 4].map((k) => 0.185 + k * 0.032);

  return (
    <group>
      {/* Titanium body */}
      <mesh geometry={parts.body}>
        <Titanium />
      </mesh>

      {/* Black glass front */}
      <mesh geometry={parts.frontGlass} position={[0, 0, HALF_D + 0.0006]}>
        <meshPhysicalMaterial
          color="#050506"
          metalness={0.15}
          roughness={0.07}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={1.5}
        />
      </mesh>

      {/*
        The screen. This plane punches a transparent hole through the canvas
        (no blending, alpha 0) so the DOM layer behind it shows through. The
        DOM stays real: crisp, selectable and clickable.
      */}
      <mesh geometry={parts.screenHole} position={[0, 0, HALF_D + 0.0014]}>
        <meshBasicMaterial
          color="#000"
          transparent
          opacity={0}
          blending={NoBlending}
          toneMapped={false}
        />
      </mesh>
      <Html
        transform
        occlude="blending"
        portal={portal as RefObject<HTMLElement>}
        position={[0, 0, HALF_D + 0.0016]}
        distanceFactor={HTML_DISTANCE_FACTOR}
        zIndexRange={[10, 0]}
      >
        <PhoneScreen rig={rig} />
      </Html>

      {/* Frosted back glass and camera bump */}
      <group position={[0, 0, -HALF_D - 0.0006]} rotation-y={Math.PI}>
        <mesh geometry={parts.backGlass}>
          <meshPhysicalMaterial
            color="#e6e2da"
            metalness={0.05}
            roughness={0.55}
            clearcoat={0.35}
            envMapIntensity={0.9}
          />
        </mesh>
        <group position={[0.2, PHONE.h / 2 - 0.3, 0]}>
          <RoundedBox args={[0.46, 0.46, 0.03]} radius={0.08} smoothness={4} position={[0, 0, 0.015]}>
            <meshPhysicalMaterial
              color="#ddd8cf"
              metalness={0.35}
              roughness={0.4}
              envMapIntensity={1}
            />
          </RoundedBox>
          <group position={[0, 0, 0.03]}>
            <Lens x={-0.105} y={0.105} />
            <Lens x={-0.105} y={-0.105} />
            <Lens x={0.105} y={0} />
          </group>
        </group>
      </group>

      {/* Bottom edge: USB-C port and speaker grilles */}
      <group position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
        <mesh geometry={parts.port}>
          <meshStandardMaterial color="#040405" roughness={0.9} />
        </mesh>
        <mesh geometry={parts.portTongue} position={[0, 0, 0.0004]}>
          <meshStandardMaterial color="#4a4a50" metalness={0.8} roughness={0.35} />
        </mesh>
        {grille.flatMap((x) =>
          [-x, x].map((gx) => (
            <mesh key={gx} position={[gx, 0, 0.0002]}>
              <circleGeometry args={[0.0105, 20]} />
              <meshStandardMaterial color="#060607" roughness={0.9} />
            </mesh>
          )),
        )}
      </group>

      {/* Side buttons: action + volume on the left, power on the right */}
      {[0.38, 0.14, -0.06].map((y, i) => (
        <RoundedBox
          key={`l${i}`}
          args={[0.016, i === 0 ? 0.07 : 0.12, 0.04]}
          radius={0.006}
          smoothness={3}
          position={[-PHONE.w / 2 - 0.003, y, 0]}
        >
          <Titanium />
        </RoundedBox>
      ))}
      <RoundedBox
        args={[0.016, 0.2, 0.04]}
        radius={0.006}
        smoothness={3}
        position={[PHONE.w / 2 + 0.003, 0.28, 0]}
      >
        <Titanium />
      </RoundedBox>
    </group>
  );
}
