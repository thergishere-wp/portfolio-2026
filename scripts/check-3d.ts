/**
 * Reliability test for the 3D device ("the phone sometimes doesn't appear").
 *
 * For each target (Projects, Activity) and each run: a fresh browser context
 * (empty cache), the network throttled to Fast 4G, a hard load, then a jump
 * STRAIGHT to the target as soon as scrolling is unlocked. The device must
 * then be up: the real model drawn (not the loading silhouette), no lost
 * context, and visible pixels where the device stands.
 *
 *   npm run dev -- -p 3100        (in another terminal)
 *   npm run check:3d -- [runs=10] [url] [outDir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const runs = Number(process.argv[2] ?? 10);
const url = process.argv[3] ?? "http://localhost:3100";
const outDir = process.argv[4] ?? path.join(process.cwd(), "check-3d");
/** Software WebGL is slow, so give the device a generous time to appear. */
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 60_000);

/** Chrome DevTools' "Fast 4G": 9 Mbit/s down, 1.5 Mbit/s up, 170 ms latency. */
const FAST_4G = {
  offline: false,
  latency: 170,
  downloadThroughput: (9 * 1024 * 1024) / 8,
  uploadThroughput: (1.5 * 1024 * 1024) / 8,
};

const TARGETS = [
  { name: "projects", vh: 3.2 },
  { name: "activity", vh: 5.4 },
] as const;

interface Result {
  target: string;
  run: number;
  ok: boolean;
  ms: number;
  detail: string;
}

/** The scene's state (set by ?debug) and whether the loading silhouette is up. */
const SCENE_STATE = `(() => JSON.stringify({
  state: window.__foldState ?? null,
  silhouette: !!document.querySelector('[class*="silhouette"]'),
}))()`;

/** Share of dark pixels (the device's bezel and island) in the middle of the viewport. */
async function darkShare(page: Page): Promise<number> {
  const png = await page.screenshot();
  const probe = await page.context().newPage();
  await probe.setContent("<body></body>");
  const share = (await probe.evaluate(
    `(async () => {
      const img = new Image();
      img.src = "data:image/png;base64,${png.toString("base64")}";
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(img.width * 0.15, img.height * 0.15, img.width * 0.7, img.height * 0.7).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 210) dark++;
      return dark / (d.length / 4);
    })()`,
  )) as number;
  await probe.close();
  return share;
}

async function oneRun(target: (typeof TARGETS)[number], run: number): Promise<Result> {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", FAST_4G);

  const started = Date.now();
  try {
    await page.goto(`${url}/?hour=12&debug`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    // Wait for the story to exist (hydrated, pinned: the page is tall), skip
    // the intro, and jump straight to the target the instant scrolling is
    // unlocked. (Before hydration there is nothing to scroll, and the
    // "locked" class does not exist yet.)
    await page.waitForFunction(
      `window.__foldState !== undefined && document.documentElement.scrollHeight > 7 * window.innerHeight`,
      null,
      { timeout: 120_000 },
    );
    await page.keyboard.press("Shift");
    await page.waitForFunction(
      `!document.documentElement.classList.contains('locked')`,
      null,
      { timeout: 60_000 },
    );
    await page.evaluate(`window.scrollTo(0, ${target.vh} * innerHeight)`);
    const jumped = Date.now();

    let detail = "";
    while (Date.now() - jumped < TIMEOUT_MS) {
      const info = JSON.parse((await page.evaluate(SCENE_STATE)) as string) as {
        state: { canvasOn: boolean; ready: boolean; contextLost: boolean } | null;
        silhouette: boolean;
      };
      detail = JSON.stringify(info);
      if (info.state?.ready && !info.state.contextLost && !info.silhouette) {
        // Give the cover/inner DOM a moment to mount, then look for pixels.
        await page.waitForTimeout(1500);
        const share = await darkShare(page);
        detail += ` dark=${(share * 100).toFixed(1)}%`;
        if (share > 0.015) {
          await browser.close();
          return { target: target.name, run, ok: true, ms: Date.now() - jumped, detail };
        }
      }
      await page.waitForTimeout(500);
    }
    mkdirSync(outDir, { recursive: true });
    await page
      .screenshot({ path: path.join(outDir, `fail-${target.name}-${run}.png`) })
      .catch(() => undefined);
    await browser.close();
    return { target: target.name, run, ok: false, ms: Date.now() - started, detail };
  } catch (error) {
    await browser.close();
    return {
      target: target.name,
      run,
      ok: false,
      ms: Date.now() - started,
      detail: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
  }
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const results: Result[] = [];
  for (const target of TARGETS) {
    for (let run = 1; run <= runs; run++) {
      const result = await oneRun(target, run);
      results.push(result);
      console.log(
        `${result.ok ? "ok  " : "FAIL"} ${target.name.padEnd(9)} run ${String(run).padStart(2)}  ${(result.ms / 1000).toFixed(1)} s  ${result.detail}`,
      );
    }
  }
  const summary = TARGETS.map((target) => {
    const own = results.filter((r) => r.target === target.name);
    const times = own.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
    const median = times.length ? times[Math.floor(times.length / 2)] : 0;
    return `${target.name}: ${own.filter((r) => r.ok).length}/${own.length} visible, median ${(median / 1000).toFixed(1)} s, max ${((times.at(-1) ?? 0) / 1000).toFixed(1)} s`;
  }).join("\n");
  console.log(`\n${summary}\n(Fast 4G, fresh context and empty cache per run, software WebGL)`);
  writeFileSync(path.join(outDir, "summary.txt"), summary);
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
}

void main();
