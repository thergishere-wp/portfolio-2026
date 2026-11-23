"use client";

import { useRef, type RefObject } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { BackSide } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { PHONE, phoneHeightPx, type PhoneRig } from "@/lib/phone-rig";
import { PhoneModel } from "./PhoneModel";

/** A soft studio built from light panels, so nothing is fetched at runtime. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/* A pale room for the metal to reflect */}
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

/**
 * Applies the rig every frame: position and size follow the visible area, so
 * the phone keeps its proportions at any window size.
 */
function Rig({
  rig,
  portal,
}: {
  rig: PhoneRig;
  portal: RefObject<HTMLElement | null>;
}) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const shadow = useRef<Group>(null);

  useFrame(({ viewport, size }) => {
    const o = outer.current;
    const i = inner.current;
    const s = shadow.current;
    if (!o || !i || !s) return;

    // World units per CSS pixel, to size the phone as a share of the window.
    const unitsPerPx = viewport.height / size.height;
    const base = (phoneHeightPx(size.height) * unitsPerPx) / PHONE.h;
    const scale = base * rig.scale;

    o.position.set(rig.x * viewport.width, rig.y * viewport.height, 0);
    i.scale.setScalar(scale);
    i.rotation.set(rig.rx, rig.ry, rig.rz);

    // The floor sits under the phone's resting bottom edge.
    s.position.y = -(PHONE.h * scale) / 2 - 0.02;
    // ContactShadows nests its plane inside its own group.
    const plane = s.getObjectByProperty("isMesh", true) as Mesh | undefined;
    if (plane) (plane.material as MeshBasicMaterial).opacity = rig.shadow;
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <PhoneModel rig={rig} portal={portal} />
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

interface PhoneCanvasProps {
  rig: PhoneRig;
  /** Stable element for the DOM screen (see PhoneModel). */
  portal: RefObject<HTMLElement | null>;
  /** Render only while the stage is on screen. */
  active: boolean;
}

/** The WebGL scene. Loaded lazily (client only) by Stage3. */
export default function PhoneCanvas({ rig, portal, active }: PhoneCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0, 0, 8], near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true }}
      frameloop={active ? "always" : "never"}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 6]} intensity={1.1} />
      <Studio />
      <Rig rig={rig} portal={portal} />
    </Canvas>
  );
}
