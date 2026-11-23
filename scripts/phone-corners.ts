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

/** Progress through the pinned phone stage for each pose. */
const POSES = [
  { name: "upright", progress: 0.2 },
  { name: "moved-left", progress: 0.5 },
  { name: "landscape", progress: 0.9 },
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
  await page.keyboard.press("Space"); // skip the intro
  await page.waitForTimeout(800);

  for (const pose of POSES) {
    await page.evaluate((progress) => {
      const spacer = document.querySelectorAll(".pin-spacer")[1];
      const top = spacer.getBoundingClientRect().top + window.scrollY;
      const length = spacer.getBoundingClientRect().height - window.innerHeight;
      window.scrollTo(0, top + progress * length);
    }, pose.progress);
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
