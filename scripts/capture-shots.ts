/**
 * Captures the fallback screenshot of each live project's framed page.
 *
 *   npm run shots              all projects
 *   npm run shots -- ceylora   only the named ids
 *
 * 1440x900, after network idle, written to public/shots/<id>.png. With --fold
 * the viewport is INNER_PX (lib/fold-rig.ts): EXACTLY the viewport and scale
 * the live iframe on the foldable's inner screen is laid out at, written to
 * public/shots/<id>-fold.jpg, so a poster and the live page never ghost. Uses the
 * installed Google Chrome, so no browser download is needed. Without Chrome,
 * run `npx playwright install chromium` and it falls back to that.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { projects } from "../content/projects";
import { INNER_PX } from "../lib/fold-rig";

const OUT_DIR = path.join(process.cwd(), "public", "shots");

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    console.log("Google Chrome not found, using Playwright's Chromium.");
    return chromium.launch();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // --fold: the shots at the foldable's inner-screen viewport (INNER_PX),
  // written to public/shots/<id>-fold.jpg.
  const fold = args.includes("--fold");
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  const targets = projects.filter(
    (p) => p.frameUrl && p.shot && (only.size === 0 || only.has(p.id)),
  );
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launch();
  const context = await browser.newContext({
    viewport: fold ? { width: INNER_PX.w, height: INNER_PX.h } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  let failed = 0;
  for (const project of targets) {
    const file = path.join(OUT_DIR, fold ? `${project.id}-fold.jpg` : `${project.id}.png`);
    const page = await context.newPage();
    try {
      await page.goto(project.frameUrl as string, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      // Long enough for entrance animations to finish, as they do in the live frame.
      await page.waitForTimeout(3000);
      await page.screenshot(
        fold ? { path: file, type: "jpeg", quality: 84 } : { path: file, type: "png" },
      );
      console.log(`ok     ${project.name.padEnd(20)} ${path.relative(process.cwd(), file)}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAILED ${project.name.padEnd(20)} ${message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  process.exitCode = failed === 0 ? 0 : 1;
}

void main();
