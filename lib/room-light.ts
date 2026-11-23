/**
 * Time-of-day lighting for the white room, driven by the real Bangkok time.
 * morning = warm and low, midday = bright and neutral, evening = golden,
 * night = a dimmer room (the iMac's screen glow then lights the desk).
 * Every value is interpolated between keyframes, so it never jumps.
 */
const BANGKOK_OFFSET_H = 7;

export interface RoomLight {
  /** Window light colour and strength. */
  sunRgb: [number, number, number];
  sunA: number;
  /** Opacity and rotation (deg) of the whole beam: low sun is flatter. */
  beamO: number;
  beamRot: number;
  /** A warm wash over the whole room. */
  tintRgb: [number, number, number];
  tintA: number;
  /** Opacity of the dim overlay (0 = bright room). */
  dim: number;
  /** 0 by day, 1 at night: drives the desk glow and the text tokens. */
  night: number;
  /** Strength of the leaf shadows and dust (they need sun). */
  fx: number;
}

/**
 * Keyframes: [hour, sunR, sunG, sunB, sunA, beamO, beamRot,
 *             tintR, tintG, tintB, tintA, dim, night, fx]
 */
const NIGHT = [255, 214, 170, 0, 0, 5, 120, 140, 200, 0, 0.17, 1, 0];

const KEYS: number[][] = [
  [0, ...NIGHT],
  [5.5, 255, 200, 150, 0.06, 0.2, 16, 255, 190, 130, 0.02, 0.14, 0.8, 0.1],
  // morning: warm and low
  [6.75, 255, 190, 130, 0.3, 0.8, 15, 255, 185, 125, 0.07, 0.05, 0.1, 0.8],
  [9, 255, 212, 165, 0.3, 0.9, 12, 255, 200, 150, 0.03, 0, 0, 1],
  // midday: bright and neutral
  [12, 255, 248, 236, 0.26, 1, 10, 255, 255, 255, 0, 0, 0, 1],
  [15, 255, 238, 205, 0.28, 1, 8, 255, 235, 200, 0.01, 0, 0, 1],
  // evening: golden
  [17.5, 255, 178, 92, 0.38, 0.95, 5, 255, 170, 70, 0.09, 0.02, 0, 1],
  [19, 255, 150, 80, 0.3, 0.7, 3, 255, 150, 70, 0.08, 0.1, 0.3, 0.8],
  [20.5, 255, 140, 90, 0.08, 0.2, 3, 150, 140, 190, 0.03, 0.17, 0.85, 0.1],
  [22, ...NIGHT],
  [24, ...NIGHT],
];

const smooth = (t: number): number => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The lighting at an hour of the day (0 to 24, fractional). */
export function lightAt(hour: number): RoomLight {
  const h = ((hour % 24) + 24) % 24;
  let i = KEYS.findIndex((key, index) => h >= key[0] && h <= KEYS[index + 1][0]);
  if (i < 0) i = KEYS.length - 2;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth((h - a[0]) / (b[0] - a[0]));
  const m = (k: number): number => mix(a[k], b[k], t);
  return {
    sunRgb: [Math.round(m(1)), Math.round(m(2)), Math.round(m(3))],
    sunA: m(4),
    beamO: m(5),
    beamRot: m(6),
    tintRgb: [Math.round(m(7)), Math.round(m(8)), Math.round(m(9))],
    tintA: m(10),
    dim: m(11),
    night: m(12),
    fx: m(13),
  };
}

/** The current Bangkok hour, fractional. `?hour=21.5` previews another time of day. */
export function bangkokHour(): number {
  const param = new URLSearchParams(window.location.search).get("hour");
  if (param !== null && param !== "" && Number.isFinite(Number(param))) {
    return Number(param);
  }
  const now = new Date();
  return (now.getUTCHours() + BANGKOK_OFFSET_H + now.getUTCMinutes() / 60) % 24;
}

const VARS = [
  "--sun-rgb",
  "--sun-a",
  "--beam-o",
  "--beam-rot",
  "--tint-rgb",
  "--tint-a",
  "--dim",
  "--night",
  "--fx",
] as const;

/** Back to the neutral defaults in globals.css. */
export function resetLight(): void {
  for (const name of VARS) document.documentElement.style.removeProperty(name);
}

/** Writes the lighting to CSS custom properties on <html>. */
export function applyLight(light: RoomLight): void {
  const root = document.documentElement.style;
  const f = (n: number): string => n.toFixed(3);
  root.setProperty("--sun-rgb", light.sunRgb.join(", "));
  root.setProperty("--sun-a", f(light.sunA));
  root.setProperty("--beam-o", f(light.beamO));
  root.setProperty("--beam-rot", `${f(light.beamRot)}deg`);
  root.setProperty("--tint-rgb", light.tintRgb.join(", "));
  root.setProperty("--tint-a", f(light.tintA));
  root.setProperty("--dim", f(light.dim));
  root.setProperty("--night", f(light.night));
  root.setProperty("--fx", f(light.fx));
}
