/**
 * Real-input scroll test for the whole story, run against a PRODUCTION build
 * in headed Chrome (GPU where there is one; the report says which renderer).
 *
 *   npm run build && npm run start -- -p 3100        (another terminal)
 *   npm run check:scroll -- <outDir> [url] [--passes=1,2,3,4,5]
 *
 * Pass 1  real wheel ticks (0, 100), top to Contact, a frame after every tick
 * Pass 2  the same back up to the top, from the same positions
 * Pass 3  trackpad-style input (30 x 15 px deltas) through Projects, both ways
 * Pass 4  a fast fling (10 ticks in 300 ms) both ways through Projects and the fold
 * Pass 5  ghosting: the poster and the live page share one viewport; the
 *         crossfade waits for the iframe's load event + 300 ms
 * Pass 6  the two unfolded halves are coplanar (mesh bounding boxes)
 *
 * Every sample checks: the step matches the scroll position, nothing from an
 * inactive step is visible, the screens match the phone's pose and
 * orientation, and no scroll drift after input stops. Frames at the same
 * scroll position are compared between passes (down vs up, slow vs fling).
 * Needs `?debug` (window.__story, window.__foldRig); `?still` freezes the
 * device's idle float so frames at one position can be compared.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { projects } from "../content/projects";
import { INNER_PX } from "../lib/fold-rig";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));
const outDir = positional[0] ?? path.join(process.cwd(), "scroll-report");
const base = positional[1] ?? "http://localhost:3100";
const passes = new Set(
  (flags.find((f) => f.startsWith("--passes="))?.slice(9) ?? "1,2,3,4,6,5").split(","),
);
const W = 1470;
const H = 812;
/** Frame at 650 ms (as the protocol asks); the rest of the checks once everything has settled. */
const FIRST_MS = 650;
const SETTLED_MS = 1550;
/** A pair of frames differs when more than this share of pixels changed noticeably. */
const PIXEL_SHARE = 0.004;

interface Sample {
  y: number;
  step: number;
  expectedStep: number;
  drift: number;
  rig: Record<string, number>;
  vis: Record<string, number>;
  issues: string[];
}

interface Probe {
  y: number;
  step: number;
  thresholds: number[];
  rig: Record<string, number>;
  vis: Record<string, number>;
  landscapeAttr: string | null;
  pill: { w: number; h: number } | null;
  iframes: { w: number; h: number; src: string }[];
}

// --- in-page probes (strings: tsx rewrites arrow functions, which breaks evaluate) ---

const PROBE = `(() => {
  const eff = (el) => {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    const r = el.getBoundingClientRect();
    const onScreen = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0;
    return onScreen ? Math.round(o * 1000) / 1000 : 0;
  };
  const all = (sel) => Math.max(0, ...[...document.querySelectorAll(sel)].map(eff));
  const rig = window.__foldRig;
  const pill = document.querySelector('[aria-label="Live status"]');
  const pr = pill ? pill.getBoundingClientRect() : null;
  return JSON.stringify({
    y: Math.round(scrollY * 10) / 10,
    story: window.__story ? { step: window.__story.step, thresholds: window.__story.thresholds } : null,
    rig: rig ? { rx: rig.rx, ry: rig.ry, rz: rig.rz, shut: rig.shut, unfold: rig.unfold, show: rig.show, open: rig.open, x: rig.x, social: rig.social, app: rig.app, lock: rig.lock } : null,
    vis: {
      card: all('[data-minic]'),
      list: all('[data-p]'),
      title: all('[data-a2-rv]'),
      repos: all('[data-repos]'),
      headline: all('[data-a3c]'),
      foot: all('[data-a3-foot]'),
      innerLock: all('[data-lock]'),
      inner: all('[data-inner]'),
      cover: all('[data-cover]'),
      coverLock: all('[data-layer=lock]'),
      coverApp: all('[data-layer=app]'),
      coverSocial: all('[data-layer=social]'),
    },
    landscapeAttr: document.querySelector('[data-cover]') ? document.querySelector('[data-cover]').dataset.landscape : null,
    pill: pr ? { w: Math.round(pr.width), h: Math.round(pr.height) } : null,
    iframes: [...document.querySelectorAll('[data-inner] iframe')].map((f) => ({ w: f.offsetWidth, h: f.offsetHeight, src: f.src })),
  });
})()`;

const DIFF = `async ([pa, pb]) => {
  const load = async (b64) => {
    const img = new Image();
    img.src = "data:image/jpeg;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  };
  const [ia, ib] = await Promise.all([load(pa), load(pb)]);
  let changed = 0, sum = 0;
  for (let i = 0; i < ia.data.length; i += 4) {
    const d = Math.abs(ia.data[i] - ib.data[i]) + Math.abs(ia.data[i + 1] - ib.data[i + 1]) + Math.abs(ia.data[i + 2] - ib.data[i + 2]);
    sum += d;
    if (d > 60) changed++;
  }
  return [changed / (ia.data.length / 4), sum / (ia.data.length / 4) / 3];
}`;

const indexAt = (y: number, thresholds: number[]): number => {
  let index = -1;
  thresholds.forEach((t, i) => {
    if (y >= t) index = i;
  });
  return index;
};

async function probe(page: Page): Promise<Probe> {
  const raw = JSON.parse((await page.evaluate(PROBE)) as string);
  return { ...raw, step: raw.story.step, thresholds: raw.story.thresholds };
}

/** What each step allows to be visible. Anything else must be hidden once things settle. */
function activeRules(step: number, count: number): Record<string, boolean> {
  const fold = 6 + count;
  const activity = fold + 1;
  const contact = fold + 2;
  return {
    card: step >= 6 && step < fold,
    list: step >= 4 && step < activity,
    title: step >= 3 && step < activity,
    repos: step >= activity && step < contact,
    headline: step >= contact,
    foot: step >= contact,
    innerLock: step === 5,
    coverLock: step < 6,
    coverApp: step >= 6 && step < contact,
    coverSocial: step >= contact,
  };
}

function check(s: Probe, count: number): string[] {
  const issues: string[] = [];
  const expected = indexAt(s.y, s.thresholds);
  if (s.step !== expected) issues.push(`step ${s.step} but the position says ${expected}`);
  const rules = activeRules(s.step, count);
  for (const [key, allowed] of Object.entries(rules)) {
    if (!allowed && s.vis[key] > 0.05) {
      issues.push(`${key} visible (${s.vis[key]}) in step ${s.step}`);
    }
  }
  const r = s.rig;
  const angle = Math.PI * (1 - r.unfold * (1 - r.shut));
  if (s.vis.cover > 0.05 && angle < 0.72 * Math.PI) {
    issues.push(`cover screen visible at hinge angle ${(angle / Math.PI).toFixed(2)}pi`);
  }
  const landscape = Math.abs(r.rz) > Math.PI / 4;
  if (s.vis.coverSocial > 0.05 && !landscape) issues.push("socials visible on an upright phone");
  if (s.landscapeAttr === "true" && !landscape) issues.push("landscape layout on an upright phone");
  if (s.pill && s.vis.cover > 0.05) {
    if (Math.abs(r.rz) > 1.1 && s.pill.h <= s.pill.w) {
      issues.push(`island not along the short edge in landscape (${s.pill.w}x${s.pill.h})`);
    }
    if (Math.abs(r.rz) < 0.5 && s.pill.h > s.pill.w) {
      issues.push(`island vertical on an upright phone (${s.pill.w}x${s.pill.h})`);
    }
  }
  if (s.vis.inner > 0.05 && !(r.unfold > 0.999 && r.shut < 0.001)) {
    issues.push("inner page visible while the halves are not flat");
  }
  return issues;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const count = projects.length;
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(`
    window.__frameLog = [];
    const watch = (f) => { if (f.__w) return; f.__w = 1; f.addEventListener('load', () => window.__frameLog.push({ type: 'load', src: f.src, t: performance.now() })); };
    new MutationObserver(() => document.querySelectorAll('iframe').forEach(watch)).observe(document, { childList: true, subtree: true });
    const seen = new Set();
    const poll = () => { document.querySelectorAll('[data-inner] iframe').forEach((f) => { if (!seen.has(f) && parseFloat(getComputedStyle(f).opacity) > 0.02) { seen.add(f); window.__frameLog.push({ type: 'show', src: f.src, t: performance.now() }); } }); requestAnimationFrame(poll); };
    requestAnimationFrame(poll);
  `);
  await page.goto(base + "/?debug&still&hour=12", { waitUntil: "networkidle" });
  // The live pages animate on their own (carousels, video): that is not a
  // scroll effect, so frames are compared with the pages hidden (the posters
  // underneath show instead). Visibility only: the load/fade logic still runs.
  await page.addStyleTag({ content: "[data-inner] iframe { visibility: hidden !important; }" });
  const renderer = (await page.evaluate(
    `(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); })()`,
  )) as string;
  console.log("renderer:", renderer);
  await page.keyboard.press("Shift"); // skip the intro
  await page.waitForFunction("window.__foldState?.ready === true", null, { timeout: 180_000 });
  await page.waitForTimeout(3500);
  await page.mouse.move(W / 2, H / 2);

  const maxScroll = (await page.evaluate(
    "document.documentElement.scrollHeight - window.innerHeight",
  )) as number;
  const ticks = Math.floor(maxScroll / 100);
  console.log(`scroll length ${maxScroll}px = ${(maxScroll / H).toFixed(2)} vh, ${ticks} full ticks`);

  const cmp = await context.newPage();
  await cmp.setContent("<body></body>");
  const diff = async (a: Buffer, b: Buffer): Promise<[number, number]> =>
    (await cmp.evaluate(
      `(${DIFF})(${JSON.stringify([a.toString("base64"), b.toString("base64")])})`,
    )) as [number, number];
  const shot = (): Promise<Buffer> => page.screenshot({ type: "jpeg", quality: 85 });

  const report: Record<string, unknown> = {
    renderer,
    viewport: `${W}x${H}`,
    maxScroll,
    passes: {},
  };
  const problems: string[] = [];

  // y (rounded to the tick grid) -> settled frame, for comparisons between passes
  const frames = new Map<number, Buffer>();
  const key = (y: number): number => Math.round(y / 50) * 50;

  /** Take a frame at 650 ms, settle, then take everything we assert on. */
  const sample = async (
    label: string,
    outFile: string | null,
  ): Promise<{ s: Sample; frame: Buffer }> => {
    await page.waitForTimeout(FIRST_MS);
    const first = await shot();
    if (outFile) writeFileSync(path.join(outDir, outFile), first);
    const a = await probe(page);
    await page.waitForTimeout(SETTLED_MS - FIRST_MS);
    const b = await probe(page);
    const frame = await shot();
    const issues = check(b, count).map((i) => `${label}: ${i}`);
    const drift = Math.round((b.y - a.y) * 10) / 10;
    if (Math.abs(drift) > 1) {
      issues.push(`${label}: drifted ${drift}px after input stopped (${FIRST_MS} -> ${SETTLED_MS} ms)`);
    }
    return {
      s: {
        y: b.y,
        step: b.step,
        expectedStep: indexAt(b.y, b.thresholds),
        drift,
        rig: b.rig,
        vis: b.vis,
        issues,
      },
      frame,
    };
  };

  // A headed Chrome on a Retina display delivers a CDP wheel delta scaled by
  // the display's pixel ratio (a (0, 100) wheel reaches the page as 200), so
  // measure what the page actually receives and send exactly the pixels meant.
  await page.evaluate(
    "window.__w = []; addEventListener('wheel', (e) => window.__w.push(e.deltaY), { capture: true, passive: true });",
  );
  await page.mouse.wheel(0, 40);
  await page.waitForTimeout(300);
  const seen = ((await page.evaluate("window.__w[0]")) as number) ?? 40;
  const wheelScale = seen / 40;
  console.log(`wheel calibration: a CDP delta of 40 reaches the page as ${seen} (x${wheelScale})`);
  // Back to the top through Lenis itself (window.scrollTo would leave its
  // internal target 80 px down and offset every later position).
  await page.evaluate("window.__lenis.scrollTo(0, { immediate: true, force: true })");
  await page.waitForTimeout(1500);
  report.wheelScale = wheelScale;
  const wheel = (dy: number): Promise<void> => page.mouse.wheel(0, dy / wheelScale);

  /** Whole ticks to a position, so positions stay on the 100 px grid. */
  const goTo = async (y: number): Promise<void> => {
    const now = (await probe(page)).y;
    let left = y - now;
    while (Math.abs(left) > 0.5) {
      const d = Math.sign(left) * Math.min(100, Math.abs(left));
      await wheel(d);
      left -= d;
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(SETTLED_MS);
  };

  // ---------------------------------------------------------------- Pass 1
  const p1: Sample[] = [];
  if (passes.has("1") || passes.has("2")) {
    mkdirSync(path.join(outDir, "p1"), { recursive: true });
    console.log("pass 1: real wheel ticks, top to Contact");
    let before = -1;
    for (let k = 1; k <= ticks + 1; k++) {
      await wheel(100);
      const { s, frame } = await sample(`p1 tick ${k}`, `p1/tick-${String(k).padStart(2, "0")}.jpg`);
      if (before >= 0 && s.step - before > 1) {
        s.issues.push(`p1 tick ${k}: crossed ${s.step - before} steps in one tick (${before} -> ${s.step})`);
      }
      before = s.step;
      p1.push(s);
      frames.set(key(s.y), frame);
      problems.push(...s.issues);
      process.stdout.write(".");
    }
    process.stdout.write("\n");
    (report.passes as Record<string, unknown>).p1 = p1;
  }

  // ---------------------------------------------------------------- Pass 2
  const p2: Sample[] = [];
  const downUp: { y: number; share: number; mean: number }[] = [];
  if (passes.has("2")) {
    mkdirSync(path.join(outDir, "p2"), { recursive: true });
    console.log("pass 2: back up to the top, from the same positions");
    const now = (await probe(page)).y;
    // Align to the tick grid first (a partial tick), so positions match pass 1.
    const aligned = Math.floor(now / 100) * 100;
    if (now - aligned > 0.5) {
      await wheel(-(now - aligned));
      await page.waitForTimeout(SETTLED_MS);
    }
    let before = (await probe(page)).step;
    for (let k = 1; k <= Math.floor(aligned / 100); k++) {
      await wheel(-100);
      const { s, frame } = await sample(`p2 tick ${k}`, `p2/tick-${String(k).padStart(2, "0")}.jpg`);
      if (before - s.step > 1) {
        s.issues.push(`p2 tick ${k}: crossed ${before - s.step} steps in one tick (${before} -> ${s.step})`);
      }
      before = s.step;
      p2.push(s);
      problems.push(...s.issues);
      const down = frames.get(key(s.y));
      if (down) {
        const [share, mean] = await diff(down, frame);
        downUp.push({ y: s.y, share, mean });
        if (share > PIXEL_SHARE) {
          problems.push(`down/up frames differ at y=${s.y} (${(share * 100).toFixed(2)}% of pixels)`);
        }
      }
      process.stdout.write(",");
    }
    process.stdout.write("\n");
    (report.passes as Record<string, unknown>).p2 = p2;
    report.downUp = downUp;
  }

  // ---------------------------------------------------------------- Pass 3
  if (passes.has("3")) {
    mkdirSync(path.join(outDir, "p3"), { recursive: true });
    console.log("pass 3: trackpad-style input (30 x 15 px) through Projects, both ways");
    const t = (await probe(page)).thresholds;
    const from = Math.ceil((t[3] - 200) / 100) * 100; // just before Projects
    const to = Math.floor((t[t.length - 3] + 200) / 100) * 100; // into the fold
    await goTo(from);
    const gesture = async (dir: 1 | -1): Promise<void> => {
      for (let i = 0; i < 30; i++) {
        await wheel(15 * dir);
        await page.waitForTimeout(16);
      }
    };
    const p3: Sample[] = [];
    let n = 0;
    for (const dir of [1, -1] as const) {
      const gestures = Math.round((to - from) / 450);
      for (let g = 0; g < gestures; g++) {
        await gesture(dir);
        n += 1;
        const { s, frame } = await sample(
          `p3 gesture ${n} (${dir > 0 ? "down" : "up"})`,
          `p3/g-${String(n).padStart(2, "0")}.jpg`,
        );
        p3.push(s);
        problems.push(...s.issues);
        const ref = frames.get(key(s.y));
        if (ref && Math.abs(s.y - key(s.y)) < 1) {
          const [share] = await diff(ref, frame);
          if (share > PIXEL_SHARE) {
            problems.push(`p3 gesture ${n}: frame at y=${s.y} differs from the wheel-tick frame (${(share * 100).toFixed(2)}%)`);
          }
        }
        process.stdout.write(dir > 0 ? "." : ",");
      }
    }
    process.stdout.write("\n");
    (report.passes as Record<string, unknown>).p3 = p3;
  }

  // ---------------------------------------------------------------- Pass 4
  if (passes.has("4")) {
    mkdirSync(path.join(outDir, "p4"), { recursive: true });
    console.log("pass 4: fast fling (10 ticks in 300 ms) through Projects and the fold, both ways");
    const t = (await probe(page)).thresholds;
    const from = Math.ceil((t[2] - 100) / 100) * 100;
    const to = Math.floor((t[t.length - 2] + 200) / 100) * 100;
    await goTo(from);
    const fling = async (dir: 1 | -1): Promise<void> => {
      for (let i = 0; i < 10; i++) {
        await wheel(100 * dir);
        await page.waitForTimeout(30);
      }
    };
    const p4: Sample[] = [];
    let n = 0;
    for (const dir of [1, -1] as const) {
      let y = (await probe(page)).y;
      while (dir > 0 ? y < to : y > from) {
        await fling(dir);
        n += 1;
        const { s, frame } = await sample(
          `p4 fling ${n} (${dir > 0 ? "down" : "up"})`,
          `p4/f-${String(n).padStart(2, "0")}.jpg`,
        );
        p4.push(s);
        problems.push(...s.issues);
        const ref = frames.get(key(s.y));
        if (ref && Math.abs(s.y - key(s.y)) < 1) {
          const [share] = await diff(ref, frame);
          if (share > PIXEL_SHARE) {
            problems.push(`p4 fling ${n}: frame at y=${s.y} differs from the wheel-tick frame (${(share * 100).toFixed(2)}%)`);
          }
        }
        process.stdout.write(dir > 0 ? "." : ",");
        if (s.y === y) break; // at an end
        y = s.y;
      }
    }
    process.stdout.write("\n");
    (report.passes as Record<string, unknown>).p4 = p4;
  }

  // ---------------------------------------------------------------- Pass 6: the unfolded halves
  if (passes.has("6")) {
    console.log("pass 6: unfolded halves coplanar (mesh bounding boxes)");
    await goTo(Math.round(((await probe(page)).thresholds[6] + 150) / 100) * 100);
    await page.waitForTimeout(2500);
    const boxes = JSON.parse(
      (await page.evaluate(`(() => {
        const scene = window.__foldScene;
        const out = { screens: [], bodies: [] };
        scene.updateMatrixWorld(true);
        const box = (o) => {
          o.geometry.computeBoundingBox();
          const b = o.geometry.boundingBox;
          const e = o.matrixWorld.elements;
          const xs = [], ys = [], zs = [];
          for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
            xs.push(e[0] * x + e[4] * y + e[8] * z + e[12]);
            ys.push(e[1] * x + e[5] * y + e[9] * z + e[13]);
            zs.push(e[2] * x + e[6] * y + e[10] * z + e[14]);
          }
          const r = (a) => [Math.min(...a), Math.max(...a)].map((v) => Math.round(v * 100000) / 100000);
          return { x: r(xs), y: r(ys), z: r(zs) };
        };
        scene.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          if (o.material && o.material.type === 'ShaderMaterial') out.screens.push(box(o));
          else if (o.geometry.type === 'ExtrudeGeometry') out.bodies.push(box(o));
        });
        return JSON.stringify(out);
      })()`)) as string,
    ) as { screens: { x: number[]; y: number[]; z: number[] }[]; bodies: { x: number[]; y: number[]; z: number[] }[] };
    const byX = (a: { x: number[] }, b: { x: number[] }): number => a.x[0] - b.x[0];
    const pair = (list: typeof boxes.screens, label: string): void => {
      if (list.length !== 2) {
        problems.push(`coplanar: expected 2 ${label}, found ${list.length}`);
        return;
      }
      const [l, r] = [...list].sort(byX);
      const eps = 1e-4;
      if (Math.abs(l.y[0] - r.y[0]) > eps || Math.abs(l.y[1] - r.y[1]) > eps) {
        problems.push(`coplanar: ${label} are not the same height (${l.y} vs ${r.y})`);
      }
      if (Math.abs(l.z[0] - r.z[0]) > eps || Math.abs(l.z[1] - r.z[1]) > eps) {
        problems.push(`coplanar: ${label} are not at the same depth (${l.z} vs ${r.z})`);
      }
      if (Math.abs(l.x[1] - r.x[0]) > eps) problems.push(`coplanar: ${label} do not meet at the hinge (${l.x[1]} vs ${r.x[0]})`);
    };
    pair(boxes.screens, "screens");
    // The two full-height slabs (the camera island and buttons are also extrusions).
    const tall = Math.max(...boxes.bodies.map((b) => b.y[1] - b.y[0]));
    pair(boxes.bodies.filter((b) => b.y[1] - b.y[0] > tall * 0.9), "bodies");
    report.coplanar = boxes;
  }

  // ---------------------------------------------------------------- Pass 5: ghosting
  if (passes.has("5")) {
    console.log("pass 5: ghosting: poster vs live viewport, and the crossfade delay");
    // Make sure each project's page has been mounted at least once.
    await goTo(Math.floor(((await probe(page)).thresholds[8] ?? 0) / 100) * 100);
    const logs = (await page.evaluate("window.__frameLog")) as {
      type: string;
      src: string;
      t: number;
    }[];
    const delays: { src: string; ms: number }[] = [];
    logs
      .filter((e) => e.type === "show")
      .forEach((e) => {
        // The latest load of that page before it became visible (a page that
        // was unmounted and mounted again loads again).
        const before = logs.filter((l) => l.type === "load" && l.src === e.src && l.t <= e.t);
        const last = before[before.length - 1];
        if (last) delays.push({ src: e.src, ms: Math.round(e.t - last.t) });
      });
    delays.forEach((d) => {
      if (d.ms < 290) {
        problems.push(`ghosting: ${d.src} became visible ${d.ms} ms after its load event (needs 300)`);
      }
    });
    const sizes = (await probe(page)).iframes;
    sizes.forEach((f) => {
      if (f.w !== INNER_PX.w || f.h !== INNER_PX.h) {
        problems.push(`ghosting: iframe ${f.w}x${f.h} is not the poster viewport ${INNER_PX.w}x${INNER_PX.h}`);
      }
    });
    // The poster against a fresh capture of the live page at the same viewport.
    const live = await context.newPage();
    await live.setViewportSize({ width: INNER_PX.w, height: INNER_PX.h });
    const posterDiffs: { id: string; share: number; mean: number }[] = [];
    for (const p of projects) {
      if (!p.frameUrl || !p.shot) continue;
      try {
        await live.goto(p.frameUrl, { waitUntil: "networkidle", timeout: 45_000 });
        await live.waitForTimeout(3000);
        const now = await live.screenshot({ type: "jpeg", quality: 85 });
        const [share, mean] = await diff(
          readFileSync(path.join("public", "shots", `${p.id}-fold.jpg`)),
          now,
        );
        posterDiffs.push({ id: p.id, share, mean });
      } catch (e) {
        problems.push(`ghosting: could not capture ${p.id}: ${String(e)}`);
      }
    }
    await live.close();
    report.ghost = { delays, iframeSizes: sizes, posterViewport: INNER_PX, posterDiffs };
  }

  // ---------------------------------------------------------------- Summary
  const thresholds = (await probe(page)).thresholds;
  const table: { step: number; fromVh: number; toVh: number; ticks: number }[] = [];
  for (let i = 0; i < thresholds.length; i++) {
    const startY = thresholds[i];
    const endY = i + 1 < thresholds.length ? thresholds[i + 1] : maxScroll;
    table.push({
      step: i,
      fromVh: Math.round((startY / H) * 100) / 100,
      toVh: Math.round((endY / H) * 100) / 100,
      ticks: Math.round(((endY - startY) / 100) * 10) / 10,
    });
  }
  report.ticksPerStep = table;
  if (p1.length) {
    const entered: Record<number, number> = {};
    p1.forEach((s, i) => {
      if (entered[s.step] === undefined) entered[s.step] = i + 1;
    });
    report.firstTickInStep = entered;
  }
  report.problems = problems;
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
  console.log(`\n${problems.length} problem(s)`);
  problems.slice(0, 80).forEach((p) => console.log("  - " + p));
  console.log("ticks per step (threshold to next threshold):");
  table.forEach((r) =>
    console.log(
      `  step ${String(r.step).padStart(2)}  ${r.fromVh.toFixed(2)}-${r.toVh.toFixed(2)} vh  ${r.ticks} ticks`,
    ),
  );
  await browser.close();
  process.exitCode = problems.length === 0 ? 0 : 1;
}

void main();
