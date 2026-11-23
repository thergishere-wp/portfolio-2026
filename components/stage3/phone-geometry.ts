import { ExtrudeGeometry, Shape } from "three";
import { PHONE } from "@/lib/phone-rig";

/** A rounded rectangle centred on the origin, in the XY plane. */
export function roundedRectShape(w: number, h: number, r: number): Shape {
  const x = -w / 2;
  const y = -h / 2;
  const s = new Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * The titanium body: a stadium-cornered slab with a rounded edge, centred on
 * the origin. The bevel grows the shape outward, so the plan is inset by it.
 */
export function createBodyGeometry(): ExtrudeGeometry {
  const bevel = 0.028;
  const shape = roundedRectShape(
    PHONE.w - 2 * bevel,
    PHONE.h - 2 * bevel,
    PHONE.r - bevel,
  );
  const geometry = new ExtrudeGeometry(shape, {
    depth: PHONE.d - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 40,
  });
  geometry.center();
  return geometry;
}
