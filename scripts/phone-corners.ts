/**
 * Verifies the phone's DOM screen against its bezel: for three poses
 * (upright, moved left beside the repos, landscape) it captures a zoomed crop
 * of each of the screen's four corners and lays them out as one image per
 * pose, so gaps, overflow and square corners are easy to see.
 *
 *   npm run dev -- -p 3100        (in another terminal)
 *   npm run check:phone -- <outDir> [url] [viewportWidth viewportHeight]
 */
import path from "node:path";
import { chromium, type Page } from "playwright";

const outDir = process.argv[2] ?? process.cwd();
const url = process.argv[3] ?? "http://localhost:3100";
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
const ZOOM = 4;
const CROP = 90;

/** Scroll position (in viewport heights) of each pose of the cover screen. */
const POSES = [
  { name: "upright", vh: 5.4 },
  { name: "beside-repos", vh: 6.0 },
  { name: "landscape", vh: 6.6 },
] as const;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

async function screenBox(page: Page): Promise<Box> {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) =>
      /__scr$/.test(d.className),
    );
    if (!el) throw new Error("phone screen not found");
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    channel: "chrome",
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: ZOOM,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Shift"); // skip the intro
  await page.waitForTimeout(800);

  for (const pose of POSES) {
    // A string, not a function: tsx rewrites functions in a way the page cannot run.
    await page.evaluate(`window.scrollTo(0, ${pose.vh} * window.innerHeight)`);
    // Lenis and the scrub both lag, and software WebGL renders slowly.
    await page.waitForTimeout(9000);

    const box = await screenBox(page);
    const corners = {
      "top left": [box.left, box.top],
      "top right": [box.right, box.top],
      "bottom left": [box.left, box.bottom],
      "bottom right": [box.right, box.bottom],
    } as const;

    for (const [label, [x, y]] of Object.entries(corners)) {
      const file = path.join(
        outDir,
        `phone-${pose.name}-${label.replace(" ", "-")}-${width}x${height}.png`,
      );
      await page.screenshot({
        path: file,
        clip: { x: x - CROP / 2, y: y - CROP / 2, width: CROP, height: CROP },
      });
    }
    console.log(`${pose.name}: screen box`, JSON.stringify(box));
  }

  await browser.close();
}

void main();
