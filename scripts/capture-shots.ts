/**
 * Captures the fallback screenshot of each live project's framed page.
 *
 *   npm run shots              all projects
 *   npm run shots -- ceylora   only the named ids
 *
 * 1440x900, after network idle, written to public/shots/<id>.png. Uses the
 * installed Google Chrome, so no browser download is needed. Without Chrome,
 * run `npx playwright install chromium` and it falls back to that.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { projects } from "../content/projects";

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
  const only = new Set(process.argv.slice(2));
  const targets = projects.filter(
    (p) => p.frameUrl && p.shot && (only.size === 0 || only.has(p.id)),
  );
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce", // settle entrance animations for a stable frame
  });

  let failed = 0;
  for (const project of targets) {
    const file = path.join(OUT_DIR, `${project.id}.png`);
    const page = await context.newPage();
    try {
      await page.goto(project.frameUrl as string, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: file, type: "png" });
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
