import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { projects, projectsAct } from "@/content/projects";
import { INNER, INNER_PX } from "@/lib/fold-rig";
import { formatBangkok } from "@/lib/time";
import type { Side } from "./fold-geometry";

/** The page a project's inner screen shows while it is not the live one. */
function foldShot(index: number): string | null {
  const project = projects[index];
  return project.shot ? `/shots/${project.id}-fold.jpg` : null;
}

/** Index of the lock-screen texture, after the projects' own. */
export const LOCK_TEXTURE = projects.length;

/** A plain stand-in for a shot that could not be loaded: the device still appears. */
function drawPlaceholder(name: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = INNER_PX.w / 2;
  canvas.height = INNER_PX.h / 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#1c1c20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(243,241,236,.7)";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(name, 32, 72);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** The lock screen's own texture: it redraws itself when the minute changes. */
export interface LockTexture extends CanvasTexture {
  redraw: () => void;
}

/**
 * The lock screen as a texture, so the device shows its lock while it unfolds
 * (the DOM lock in InnerScreen takes over, identical, once it is open). The
 * wallpaper is project 0's own page, blurred; then the date, the Bangkok
 * time, the lock icon and the hint. Sizes match inner.module.css.
 */
function drawLock(wallpaper: CanvasImageSource | null): LockTexture {
  const { w, h } = INNER_PX;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const small = document.createElement("canvas");
  small.width = 40;
  small.height = Math.round((40 * h) / w);
  const sctx = small.getContext("2d");
  if (wallpaper && sctx) {
    // Blur by shrinking hard and scaling back up with smoothing.
    sctx.drawImage(wallpaper, 0, 0, small.width, small.height);
  }
  let minute = "";

  const draw = (): void => {
    const now = new Date();
    const clock = formatBangkok("short", now);
    if (clock === minute) return;
    minute = clock;
    const date = formatBangkok("menubar", now).split(" ").slice(0, 3).join(" ");
    const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#1b1830";
    ctx.fillRect(0, 0, w, h);
    if (wallpaper) ctx.drawImage(small, -w * 0.06, -h * 0.06, w * 1.12, h * 1.12);
    ctx.fillStyle = "rgba(14,12,26,.46)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.save();
    ctx.translate(w / 2 - 27, 92);
    ctx.scale(54 / 24, 54 / 24);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.88)";
    ctx.stroke(new Path2D("M8 11V7.5a4 4 0 0 1 8 0V11"));
    ctx.beginPath();
    ctx.roundRect(5, 11, 14, 10, 2.5);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.font = `500 32px ${family}`;
    ctx.fillText(date, w / 2, 232);
    ctx.fillStyle = "#fff";
    ctx.font = `300 200px ${family}`;
    ctx.fillText(clock, w / 2, 410);
    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.font = `500 22px ui-monospace, monospace`;
    ctx.fillText("BANGKOK", w / 2, 462);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = `500 21px ui-monospace, monospace`;
    ctx.fillText(projectsAct.lockedLabel.toUpperCase(), w / 2, h - 64);
    texture.needsUpdate = true;
  };

  const texture = new CanvasTexture(canvas) as LockTexture;
  texture.colorSpace = SRGBColorSpace;
  // Checked every few seconds, not every frame.
  let checked = 0;
  texture.redraw = () => {
    const t = performance.now();
    if (t - checked < 4000) return;
    checked = t;
    draw();
  };
  draw();
  return texture;
}

let cache: Promise<Texture[]> | null = null;

/**
 * Every project's inner-screen texture (in project order), then the lock
 * screen's, loaded once and shared. Never rejects.
 */
export function loadFoldTextures(): Promise<Texture[]> {
  if (cache) return cache;
  const loader = new TextureLoader();
  cache = Promise.all(
    projects.map(async (project, i) => {
      const src = foldShot(i);
      let texture: Texture;
      try {
        if (!src) throw new Error("no shot");
        texture = await loader.loadAsync(src);
      } catch {
        // A failed request (offline, throttled) must not take the device down.
        texture = drawPlaceholder(project.name);
      }
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      return texture;
    }),
  ).then((textures) => {
    const first = textures[0]?.image as CanvasImageSource | undefined;
    return [...textures, drawLock(first ?? null)];
  });
  return cache;
}

/** Uniforms shared by both halves' screens, so one update moves both. */
export interface ScreenUniforms {
  uA: { value: Texture | null };
  uB: { value: Texture | null };
  uP: { value: number };
  uMode: { value: number };
  uAspect: { value: number };
  /** 1 while the two halves lie flat (crease shading), else 0. */
  uFlat: { value: number };
}

export function createScreenUniforms(): ScreenUniforms {
  return {
    uA: { value: null },
    uB: { value: null },
    uP: { value: 1 },
    uMode: { value: 0 },
    uAspect: { value: (2 * INNER.w) / INNER.h },
    uFlat: { value: 0 },
  };
}

const VERTEX = /* glsl */ `
  uniform float uSide;
  uniform float uCentre;
  uniform float uUnionW;
  uniform float uH;
  varying vec2 vUv;
  void main() {
    // Screen coordinates across BOTH halves, from the vertex's own position.
    vUv = vec2(0.5 + (uSide * uCentre + position.x) / uUnionW, 0.5 + position.y / uH);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uP;
  uniform float uMode;
  uniform float uAspect;
  uniform float uFlat;
  varying vec2 vUv;

  // Every poster is captured at exactly the iframe's viewport (INNER_PX), and
  // the screen has that aspect, so it is sampled 1:1: no crop, no scaling.
  vec3 shot(sampler2D t, vec2 uv) {
    return texture2D(t, clamp(uv, 0.0, 1.0)).rgb;
  }
  float ease(float x) { return x * x * (3.0 - 2.0 * x); }
  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 uv = vUv;
    float p = clamp(uP, 0.0, 1.0);
    vec3 col;

    if (uMode < 0.5) {
      // Crossfade.
      col = mix(shot(uA, uv), shot(uB, uv), ease(p));

    } else if (uMode < 1.5) {
      // Push: the old page slides out to the left as the new one slides in
      // from the right. Full size, edge to edge: no shrinking, no bands.
      float t = ease(p);
      col = uv.x < 1.0 - t
        ? shot(uA, vec2(uv.x + t, uv.y))
        : shot(uB, vec2(uv.x - (1.0 - t), uv.y));
      col *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.05, abs(uv.x - (1.0 - t)))) * step(0.001, t) * step(t, 0.999);

    } else if (uMode < 2.5) {
      // Soft horizontal page turn: the new page wipes in from the left, the
      // old page lifts a little ahead of the edge and is shaded by it.
      float front = mix(-0.18, 1.18, ease(p));
      float d = uv.x - front;
      vec2 warped = vec2(uv.x + 0.06 * smoothstep(0.0, 0.5, d) * (1.0 - p), uv.y);
      vec3 a = shot(uA, warped);
      vec3 b = shot(uB, uv);
      a *= 1.0 - 0.32 * exp(-pow(d * 7.0, 2.0)) * step(0.0, d + 0.02);
      col = mix(b, a, smoothstep(-0.03, 0.09, d));
      col += 0.08 * exp(-pow((d + 0.02) * 40.0, 2.0));

    } else if (uMode < 3.5) {
      // Blueprint scan: a line sweeps from the top down. Above it is the new
      // page; a faint grid shows around the line.
      float front = 1.0 - ease(p);
      float d = uv.y - front;
      vec3 a = shot(uA, uv);
      vec3 b = shot(uB, uv);
      vec2 g = fract(uv * vec2(uAspect * 14.0, 14.0));
      float grid = max(step(0.94, g.x), step(0.94, g.y));
      float near = smoothstep(0.35, 0.0, abs(d));
      col = d > 0.0 ? b : a;
      col = mix(col, vec3(0.35, 0.8, 1.0), grid * near * 0.55);
      col += vec3(0.25, 0.75, 1.0) * exp(-pow(d * 70.0, 2.0)) * 1.4;

    } else {
      // Arch iris: the new page appears through an arch that opens from the
      // centre until it covers the screen (it echoes the arch frames).
      float e = ease(p);
      float s = mix(0.04, 1.5, e);
      vec2 q = (uv - vec2(0.5, 0.46)) * vec2(uAspect, 1.0);
      float w = s * 0.42;
      float top = s * 0.5;
      float box = max(abs(q.x) - w, max(q.y - (top - w), -top));
      float circ = length(q - vec2(0.0, top - w)) - w;
      float arch = q.y > top - w ? circ : box;
      vec3 a = shot(uA, uv);
      vec3 b = shot(uB, uv);
      col = mix(a, b, 1.0 - smoothstep(-0.004, 0.004, arch));
      col += vec3(0.78, 0.66, 0.42) * (1.0 - smoothstep(0.0, 0.012, abs(arch))) * 0.85 * (1.0 - e);
    }

    // A very subtle crease where the halves meet, only while they lie flat.
    float dx = (vUv.x - 0.5) * ${INNER_PX.w}.0;
    col *= 1.0 - 0.06 * uFlat * exp(-dx * dx / 40.0);

    gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
  }
`;

/** One half's inner-screen material (side: +1 right, -1 left). */
export function createScreenMaterial(
  side: Side,
  shared: ScreenUniforms,
  centreX: number,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...shared,
      uSide: { value: side },
      uCentre: { value: Math.abs(centreX) },
      uUnionW: { value: 2 * INNER.w },
      uH: { value: INNER.h },
    },
    toneMapped: false,
  });
}
