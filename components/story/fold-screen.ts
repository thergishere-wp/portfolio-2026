import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { projects } from "@/content/projects";
import { FOLD, INNER } from "@/lib/fold-rig";
import type { Side } from "./fold-geometry";

/** The page a project's inner screen shows while it is not the live one. */
function foldShot(index: number): string | null {
  const project = projects[index];
  return project.status === "soon" || !project.shot ? null : `/shots/${project.id}-fold.jpg`;
}

/** KaYo's site is not live, so its screen is drawn: the "Launching soon" card. */
function drawSoonCard(): CanvasTexture {
  const w = 1024;
  const h = 784;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#26262b");
  bg.addColorStop(1, "#141417");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.78, h * 0.18, 10, w * 0.78, h * 0.18, 420);
  glow.addColorStop(0, "rgba(91,61,245,.38)");
  glow.addColorStop(1, "rgba(91,61,245,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f3f1ec";
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText("KaYo.", 64, 100);
  ctx.fillStyle = "rgba(240,170,60,.16)";
  ctx.beginPath();
  ctx.roundRect(w - 304, 62, 240, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#f0aa3c";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText("Launching soon", w - 270, 96);
  ctx.fillStyle = "#f3f1ec";
  ctx.font = "400 76px Georgia, serif";
  ctx.fillText("Custom platforms for", 64, 340);
  ctx.fillText("small business,", 64, 428);
  ctx.fillStyle = "#a99cff";
  ctx.font = "italic 400 76px Georgia, serif";
  ctx.fillText("built fast and kept", 64, 516);
  ctx.fillText("running.", 64, 604);
  ctx.fillStyle = "rgba(243,241,236,.55)";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText("Build + monthly retainer   Next.js · Supabase   TH · NZ · LK", 64, 712);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A plain stand-in for a shot that could not be loaded: the device still appears. */
function drawPlaceholder(name: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 392;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#1c1c20";
  ctx.fillRect(0, 0, 512, 392);
  ctx.fillStyle = "rgba(243,241,236,.7)";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(name, 32, 72);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

let cache: Promise<Texture[]> | null = null;

/** Every project's inner-screen texture, loaded once and shared. Never rejects. */
export function loadFoldTextures(): Promise<Texture[]> {
  if (cache) return cache;
  const loader = new TextureLoader();
  cache = Promise.all(
    projects.map(async (project, i) => {
      const src = foldShot(i);
      let texture: Texture;
      try {
        texture = src ? await loader.loadAsync(src) : drawSoonCard();
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
  );
  return cache;
}

/** Uniforms shared by both halves' screens, so one update moves both. */
export interface ScreenUniforms {
  uA: { value: Texture | null };
  uB: { value: Texture | null };
  uP: { value: number };
  uMode: { value: number };
  uAspect: { value: number };
}

export function createScreenUniforms(): ScreenUniforms {
  return {
    uA: { value: null },
    uB: { value: null },
    uP: { value: 1 },
    uMode: { value: 0 },
    uAspect: { value: (2 * (INNER.w + FOLD.crease)) / INNER.h },
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
  varying vec2 vUv;

  const float TEX_ASPECT = 1024.0 / 784.0;

  // Cover-fit: the shot fills the screen, cropped at the sides if needed.
  vec3 shot(sampler2D t, vec2 uv) {
    vec2 s = uv;
    s.x = 0.5 + (uv.x - 0.5) * (uAspect / TEX_ASPECT);
    return texture2D(t, clamp(s, 0.0, 1.0)).rgb;
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
      // App switcher: both pages shrink to cards and slide sideways.
      col = vec3(0.075, 0.075, 0.09);
      float t = ease(p);
      float sA = mix(1.0, 0.7, ease(clamp(p / 0.42, 0.0, 1.0)));
      float sB = mix(0.7, 1.0, ease(clamp((p - 0.5) / 0.5, 0.0, 1.0)));
      vec2 cA = vec2(0.5 - 1.02 * t, 0.5);
      vec2 cB = vec2(0.5 + 1.02 * (1.0 - t), 0.5);
      vec2 qa = (uv - cA) / sA;
      vec2 qb = (uv - cB) / sB;
      float da = sdRoundBox(qa * vec2(uAspect, 1.0) - vec2(0.5 * uAspect, 0.5) + vec2(0.5 * uAspect, 0.5), vec2(0.5 * uAspect, 0.5), 0.05);
      float db = sdRoundBox(qb * vec2(uAspect, 1.0), vec2(0.5 * uAspect, 0.5), 0.05);
      col = mix(col, shot(uA, qa + 0.5) * 0.92, 1.0 - smoothstep(-0.004, 0.004, da));
      col *= 1.0 - 0.35 * smoothstep(0.06, 0.0, db) * step(0.0, db);
      col = mix(col, shot(uB, qb + 0.5), 1.0 - smoothstep(-0.004, 0.004, db));

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
      uUnionW: { value: 2 * (INNER.w + FOLD.crease) },
      uH: { value: INNER.h },
    },
    toneMapped: false,
  });
}
