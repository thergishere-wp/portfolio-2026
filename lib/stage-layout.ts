/**
 * Stage 1 layout math, ported from the prototype's layout().
 *
 * The iMac screen keeps a realistic aspect ratio whatever the window shape.
 * Screen content is rendered at "cover" size (Ws*S x Hs*S) and scaled by 1/S,
 * so at full zoom it is pixel-crisp at 1:1. A centred "safe box" of exactly
 * vw x vh inside the screen holds all content, so nothing important is cropped.
 */

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** Proportions, all multiples of the screen width Ws. */
const K = { bezel: 0.026, chin: 0.1, neck: 0.15, foot: 0.018 } as const;

export interface StageLayout {
  vw: number;
  vh: number;
  /** Screen width and height. */
  ws: number;
  hs: number;
  bezel: number;
  chin: number;
  neck: number;
  foot: number;
  neckW: number;
  footW: number;
  bodyW: number;
  bodyH: number;
  /** Total height: body + neck + foot. */
  total: number;
  /** Radius of the body's corners. */
  radius: number;
  left: number;
  top: number;
  /** Zoom scale that makes the screen cover the viewport. */
  zoomScale: number;
  zoomY: number;
  bgScale: number;
  bgY: number;
  /** Screen content at full "cover" size. */
  cw: number;
  ch: number;
}

export function computeStageLayout(vw: number, vh: number): StageLayout {
  const ars = clamp(vh / vw, 0.56, 0.66);
  const ws = Math.min(
    vw * 0.46,
    (vh * 0.7) / (ars + 2 * K.bezel + K.chin + K.neck + K.foot),
  );
  const hs = ws * ars;
  const bezel = ws * K.bezel;
  const chin = ws * K.chin;
  const neck = ws * K.neck;
  const foot = ws * K.foot;
  const bodyW = ws + 2 * bezel;
  const bodyH = hs + 2 * bezel + chin;
  const total = bodyH + neck + foot;
  const top = (vh - total) / 2 - vh * 0.015;
  const zoomScale = Math.max(vw / ws, vh / hs);

  return {
    vw,
    vh,
    ws,
    hs,
    bezel,
    chin,
    neck,
    foot,
    neckW: ws * 0.27,
    footW: ws * 0.3,
    bodyW,
    bodyH,
    total,
    radius: ws * 0.022,
    left: (vw - bodyW) / 2,
    top,
    zoomScale,
    zoomY: vh / 2 - (top + bezel + hs / 2),
    bgScale: 0.74,
    bgY: -vh * 0.05,
    cw: ws * zoomScale,
    ch: hs * zoomScale,
  };
}

/** CSS custom properties consumed by the iMac stylesheets. */
export function stageCssVars(l: StageLayout): Record<string, string> {
  const px = (n: number): string => `${n}px`;
  return {
    "--vw": px(l.vw),
    "--vh": px(l.vh),
    "--ws": px(l.ws),
    "--hs": px(l.hs),
    "--b": px(l.bezel),
    "--chin": px(l.chin),
    "--neck": px(l.neck),
    "--foot": px(l.foot),
    "--bodyW": px(l.bodyW),
    "--bodyH": px(l.bodyH),
    "--neckW": px(l.neckW),
    "--footW": px(l.footW),
    "--r": px(l.radius),
    "--left": px(l.left),
    "--top": px(l.top),
    "--cw": px(l.cw),
    "--ch": px(l.ch),
    "--sx": px((l.cw - l.vw) / 2),
    "--sy": px((l.ch - l.vh) / 2),
    "--s": String(1 / l.zoomScale),
  };
}
