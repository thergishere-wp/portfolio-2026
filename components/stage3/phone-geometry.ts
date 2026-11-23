import { Shape, type BufferGeometry } from "three";

/** The screen mesh as measured from its geometry (local units). */
export interface ScreenMetrics {
  /** Bounding box size and centre, in the phone's local space. */
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** Corner radius, measured from the outline. */
  r: number;
  /** The DOM screen, laid out at `pxWidth` wide and mapped onto the mesh. */
  px: { w: number; h: number; r: number };
  /**
   * drei's <Html transform> shows W px as W * distanceFactor / 400 world units
   * (times the group's scale), so this makes the DOM exactly the mesh's size.
   */
  distanceFactor: number;
}

/**
 * Measures a flat, rounded-rectangle screen mesh: its bounding box in local
 * space and its corner radius (the flat part of the top edge is the width
 * minus two radii), then derives the DOM size, corner radius and drei
 * distanceFactor from them. Nothing here is a hand-typed screen size.
 */
export function measureScreen(
  geometry: BufferGeometry,
  pxWidth: number,
): ScreenMetrics {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const position = geometry.getAttribute("position");
  if (!box || !position) throw new Error("screen geometry has no vertices");

  const w = box.max.x - box.min.x;
  const h = box.max.y - box.min.y;

  // The vertices lying on the top edge span the flat part of that edge.
  let flatMin = Infinity;
  let flatMax = -Infinity;
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getY(i) - box.max.y) < 1e-6) {
      flatMin = Math.min(flatMin, position.getX(i));
      flatMax = Math.max(flatMax, position.getX(i));
    }
  }
  const r = (w - (flatMax - flatMin)) / 2;

  const k = pxWidth / w;
  return {
    w,
    h,
    cx: (box.max.x + box.min.x) / 2,
    cy: (box.max.y + box.min.y) / 2,
    r,
    px: { w: pxWidth, h: h * k, r: r * k },
    distanceFactor: (400 * w) / pxWidth,
  };
}

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
