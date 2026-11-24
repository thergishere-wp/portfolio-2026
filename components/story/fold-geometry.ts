import { ExtrudeGeometry, Shape, ShapeGeometry } from "three";
import { COVER, FOLD, INNER } from "@/lib/fold-rig";
import { roundedRectShape } from "../stage3/phone-geometry";

/** Corner radii in the order top-left, top-right, bottom-right, bottom-left. */
type Radii = readonly [number, number, number, number];

/** A rounded rectangle centred on the origin with a radius per corner. */
export function roundedRect4(w: number, h: number, radii: Radii): Shape {
  const [tl, tr, br, bl] = radii;
  const x = -w / 2;
  const y = -h / 2;
  const s = new Shape();
  s.moveTo(x + bl, y);
  s.lineTo(x + w - br, y);
  if (br) s.absarc(x + w - br, y + br, br, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - tr);
  if (tr) s.absarc(x + w - tr, y + h - tr, tr, 0, Math.PI / 2, false);
  s.lineTo(x + tl, y + h);
  if (tl) s.absarc(x + tl, y + h - tl, tl, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + bl);
  if (bl) s.absarc(x + bl, y + bl, bl, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** +1 = the right half, -1 = the left half. */
export type Side = 1 | -1;

/** Radii for a half: round on the outer side, nearly square at the hinge. */
function radii(side: Side, outer: number, inner: number): Radii {
  return side === 1 ? [inner, outer, outer, inner] : [outer, inner, inner, outer];
}

/** The hinge-side corner radius of the body and the screens. */
const HINGE_R = 0.02;

/** The titanium slab of one half, with a rounded edge and a flat band for the port. */
export function bodyGeometry(side: Side): ExtrudeGeometry {
  const bevel = 0.02;
  const shape = roundedRect4(
    FOLD.w - 2 * bevel,
    FOLD.h - 2 * bevel,
    radii(side, FOLD.r - bevel, HINGE_R),
  );
  const geometry = new ExtrudeGeometry(shape, {
    depth: FOLD.d - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geometry.center();
  return geometry;
}

/** The black glass plate that frames a screen (the bezel is the visible margin). */
export function glassGeometry(side: Side): ShapeGeometry {
  return new ShapeGeometry(
    roundedRect4(FOLD.w - 0.024, FOLD.h - 0.024, radii(side, FOLD.r - 0.012, HINGE_R)),
    20,
  );
}

/** The inner screen of one half. */
export function innerScreenGeometry(side: Side): ShapeGeometry {
  return new ShapeGeometry(
    roundedRect4(INNER.w, INNER.h, radii(side, INNER.r, 0)),
    20,
  );
}

/**
 * Both inner screens as one rounded rectangle. It is never drawn: the DOM
 * overlay is sized and clipped from its measured size and corner radius.
 */
export function unionScreenGeometry(): ShapeGeometry {
  return new ShapeGeometry(
    roundedRectShape(2 * INNER.w, INNER.h, INNER.r),
    48,
  );
}

/** The cover screen on the outer face of the right half. */
export function coverScreenGeometry(): ShapeGeometry {
  return new ShapeGeometry(roundedRectShape(COVER.w, COVER.h, COVER.r), 48);
}

/** X of an inner screen's centre, in its half's coordinates (the hinge is x = 0). */
export const innerCentreX = (side: Side): number => side * (INNER.w / 2);
