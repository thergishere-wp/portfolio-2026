/**
 * Shared state for the 3D phone. The scroll timeline tweens this plain object;
 * the R3F scene and the phone's DOM screen read it every frame. That keeps the
 * timeline independent of when the lazy canvas finishes loading.
 */
export interface PhoneRig {
  /** Rotation in radians, applied to the phone. */
  rx: number;
  ry: number;
  rz: number;
  /** Offset as a fraction of the visible width / height. +y is up. */
  x: number;
  y: number;
  /** Multiplier on the base size (1 = the resting, upright size). */
  scale: number;
  /** Floor shadow opacity, 0 to 1. */
  shadow: number;
  /** Screen layer opacities, 0 to 1. */
  logo: number;
  app: number;
  social: number;
  /** Progress of the social icons' entrance, 0 to 1. */
  apps: number;
}

/**
 * Where the phone starts: lying back with its bottom edge toward the camera,
 * so the USB-C port and speaker grilles are clearly visible.
 */
export const START_POSE = {
  rx: -1.3,
  ry: -0.35,
  rz: 0.12,
  x: 0,
  y: -0.08,
  scale: 0.62,
} as const;

export function createPhoneRig(): PhoneRig {
  return {
    ...START_POSE,
    shadow: 0,
    logo: 1,
    app: 0,
    social: 0,
    apps: 0,
  };
}

/** The phone sits 22% of the viewport width left of centre beside the repos. */
export const PHONE_X_WITH_REPOS = -0.22;

/** Resting phone height in CSS px: 72% of the viewport, capped. */
export function phoneHeightPx(viewportHeight: number): number {
  return Math.min(viewportHeight * 0.72, 760);
}

/** Scale that turns the phone to landscape and fills about 62% of the width. */
export function landscapeScale(vw: number, vh: number): number {
  return Math.min(1.25, (vw * 0.62) / phoneHeightPx(vh));
}

/**
 * Phone dimensions in world units (width = 1). Proportions follow a modern
 * iPhone: 70.6 x 146.6 x 8.25 mm, with a large stadium-style corner radius.
 */
export const PHONE = {
  w: 1,
  h: 2.077,
  d: 0.118,
  /** Corner radius in plan. */
  r: 0.17,
  /** Black border between the frame and the screen. */
  bezel: 0.05,
} as const;

export const SCREEN = {
  w: PHONE.w - 2 * PHONE.bezel,
  h: PHONE.h - 2 * PHONE.bezel,
  r: PHONE.r - PHONE.bezel,
} as const;

/** The DOM screen is laid out at this size, then mapped onto the screen mesh. */
const SCREEN_PX_W = 390;
export const SCREEN_PX = {
  w: SCREEN_PX_W,
  h: Math.round((SCREEN_PX_W * SCREEN.h) / SCREEN.w),
} as const;

/**
 * drei's <Html transform> shows a DOM element of W px as W * distanceFactor / 400
 * world units wide, so this distanceFactor makes the DOM exactly fill the screen.
 */
export const HTML_DISTANCE_FACTOR = (400 * SCREEN.w) / SCREEN_PX.w;
