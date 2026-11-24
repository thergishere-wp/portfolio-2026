/**
 * Shared state for the 3D foldable. The scroll timeline and its steps tween
 * this plain object; the R3F scene and the DOM screens read it every frame,
 * so the story never waits for the lazy canvas.
 *
 * One tween owns each field (nothing is animated by two tweens), which keeps
 * a frame a pure function of the scroll position:
 *  - scrubbed (camera): x, y, rx, ry, rz, scale, shadow, shut
 *  - time-based (steps): show, unfold, turn, trans, from, to, lock, app, ...
 */
export interface FoldRig {
  /** Device pose. Offsets are fractions of the visible width / height (+y up). */
  x: number;
  y: number;
  rx: number;
  ry: number;
  rz: number;
  /** Multiplier on the Projects size (1 = the size of the unfolded device in Projects). */
  scale: number;
  /** Floor shadow opacity. */
  shadow: number;
  /** Strength of the idle float (1 normally, 0 under `?still`, which tests use). */
  bob: number;
  /** Scrubbed: 0 = as the steps left it, 1 = folded shut for the Activity phone. */
  shut: number;
  /** Time-based presence, 0 (hidden) to 1. */
  show: number;
  /** Time-based: 0 = folded, 1 = fully open. */
  unfold: number;
  /** Extra yaw (radians) that eases to 0 as the device unfolds: it turns toward the camera. */
  turn: number;
  /** Screen transition progress (0 = project `from`, 1 = project `to`) and its two projects. */
  trans: number;
  from: number;
  to: number;
  /** The unlock progress of the inner screen's lock (0 = locked, 1 = slid away). */
  open: number;
  /** Opacity of each project's live page over the inner screen, by project index. */
  frames: Record<number, number>;
  /** Cover-screen layer opacities, 0 to 1. */
  lock: number;
  app: number;
  social: number;
  /** Progress of the social icons' entrance, 0 to 1. */
  apps: number;
}

/** Dimensions in world units. Each half is `w` wide; unfolded the inner screen is 4:3. */
export const FOLD = {
  w: 1.03,
  h: 1.55,
  /** Thickness of one half. */
  d: 0.085,
  /** Corner radius in plan. */
  r: 0.11,
  /** Black border between the frame and a screen's outer edges. */
  bezel: 0.034,
  /** Radius of the hinge barrel. */
  hinge: 0.05,
} as const;

/**
 * The inner screen of one half. The two halves' screens meet exactly at the
 * hinge (x = 0), so the unfolded screen is one continuous plane: there is no
 * gap for the hinge barrel to show through.
 */
export const INNER = {
  w: FOLD.w - FOLD.bezel,
  h: FOLD.h - 2 * FOLD.bezel,
  /** Corner radius of the outer corners. */
  r: FOLD.r - FOLD.bezel,
} as const;

/**
 * The viewport, in CSS px, that the live iframe is laid out at AND that every
 * poster screenshot is captured at (`npm run shots -- --fold`). The shader
 * maps the poster 1:1 onto the unfolded screen, so a poster and the live page
 * share the same viewport and scale and a crossfade between them cannot ghost.
 */
export const INNER_PX = {
  w: 1024,
  h: Math.round((1024 * INNER.h) / (2 * INNER.w)),
} as const;

/** The cover screen on the outer face of the right half. */
export const COVER = {
  w: FOLD.w - 2 * FOLD.bezel,
  h: FOLD.h - 2 * FOLD.bezel,
  r: FOLD.r - FOLD.bezel,
} as const;

/**
 * Where the device sits in Projects: right of centre, a little above the
 * middle, square to the camera (no yaw), so the two unfolded halves are
 * coplanar and show the same height and the same scale.
 */
export const PROJECTS_POSE = { x: 0.215, y: 0.02, rx: 0.03, ry: 0, rz: 0 } as const;

export function createFoldRig(): FoldRig {
  return {
    ...PROJECTS_POSE,
    scale: 1,
    shadow: 0,
    bob: 1,
    shut: 0,
    show: 0,
    unfold: 0,
    turn: -0.5,
    trans: 1,
    from: 0,
    to: 0,
    open: 0,
    frames: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    lock: 1,
    app: 0,
    social: 0,
    apps: 0,
  };
}

/** Stops the device's idle float (a time-based motion), so tests compare only scroll-driven state. */
export function holdStill(rig: FoldRig): void {
  rig.bob = 0;
}

/** Hinge angle in radians: 0 = flat and open, PI = folded shut. */
export function foldAngle(rig: FoldRig): number {
  return Math.PI * (1 - rig.unfold * (1 - rig.shut));
}

/**
 * Size of the device in CSS px per world unit, in Projects: the unfolded
 * device (2 halves wide) fills about 44% of the width, but never more than
 * 80% of the height.
 */
export function projectsPxPerUnit(vw: number, vh: number): number {
  const unfoldedW = 2 * FOLD.w;
  return Math.min((vw * 0.44) / unfoldedW, (vh * 0.8) / FOLD.h);
}
