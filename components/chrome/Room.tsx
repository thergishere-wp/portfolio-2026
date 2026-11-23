"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  applyLight,
  bangkokHour,
  lightAt,
  resetLight,
} from "@/lib/room-light";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";
import { Dust } from "./Dust";
import styles from "./Room.module.css";

/** Light is re-read from the clock this often; values interpolate smoothly. */
const LIGHT_TICK_MS = 30_000;

interface Leaf {
  x: number;
  y: number;
  angle: number;
  rx: number;
  ry: number;
}

/**
 * Rounded so the server and the browser print identical attributes: Math
 * functions can differ in the last float digits between Node and Chrome,
 * which would be a hydration mismatch.
 */
const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * A leafy branch, laid along a curve with a leaf pair at each step. Built from
 * numbers (no randomness), so the shadow is the same on server and client.
 */
function branch(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  steps: number,
  size: number,
): Leaf[] {
  const leaves: Leaf[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const along = (Math.atan2(dy, dx) * 180) / Math.PI;
    const scale = size * (1.15 - t * 0.6);
    for (const side of [-1, 1]) {
      leaves.push({
        x: round(x + side * 10 * scale * 0.3),
        y: round(y + side * 6),
        angle: round(along + side * (52 + (i % 3) * 8)),
        rx: round(30 * scale),
        ry: round(12 * scale),
      });
    }
  }
  return leaves;
}

const BRANCH_A = branch([410, -10], [270, 70], [40, 310], 11, 1);
const BRANCH_B = branch([-10, 380], [90, 300], [330, 150], 8, 0.8);

function Leaves({ leaves, className }: { leaves: Leaf[]; className: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        {leaves.map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.x}
            cy={leaf.y}
            rx={leaf.rx}
            ry={leaf.ry}
            transform={`rotate(${leaf.angle} ${leaf.x} ${leaf.y})`}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * The fixed white room. The window light drifts gently against the cursor,
 * carries soft leaf shadows and drifting dust, and follows the real Bangkok
 * time of day. All of that is switched off under prefers-reduced-motion.
 */
export function Room() {
  const beamRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const beam = beamRef.current;
      if (!beam || reduced) return;

      const toX = gsap.quickTo(beam, "x", { duration: 1.6, ease: "power3" });
      const toY = gsap.quickTo(beam, "y", { duration: 1.6, ease: "power3" });
      const onMove = (e: PointerEvent): void => {
        toX((e.clientX / window.innerWidth - 0.5) * -40);
        toY((e.clientY / window.innerHeight - 0.5) * -24);
      };

      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    },
    { dependencies: [reduced] },
  );

  // Time-of-day light, written to CSS variables the whole page can read.
  useEffect(() => {
    if (reduced) return;
    const update = (): void => applyLight(lightAt(bangkokHour()));
    update();
    const id = window.setInterval(update, LIGHT_TICK_MS);
    return () => {
      window.clearInterval(id);
      resetLight();
    };
  }, [reduced]);

  return (
    <div className={styles.room} aria-hidden="true">
      <div className={styles.floor} />
      <div className={styles.cove} />
      <div ref={beamRef} className={styles.beam}>
        <div className={styles.sun} />
        {reduced ? null : (
          <div className={styles.fx}>
            <Leaves leaves={BRANCH_A} className={styles.leavesA} />
            <Leaves leaves={BRANCH_B} className={styles.leavesB} />
            <Dust />
          </div>
        )}
      </div>
      <div className={styles.tint} />
      <div className={styles.vignette} />
      <div className={styles.dim} />
    </div>
  );
}
