/**
 * Captures the Open Graph image: the white room with the iMac, as the site
 * itself draws it once the intro has finished (RG on the screen).
 *
 *   npm run build && npm run start     (in another terminal, port 3000)
 *   npm run og                         writes app/opengraph-image.png
 *   npm run og -- https://some.url     capture another URL
 *
 * 1200x630, the size social cards use. The scroll hint and side nav are hidden
 * so the card is just the room and the machine.
 */
import path from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000";
const out = path.join(process.cwd(), "app", "opengraph-image.png");

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  // The intro takes about 6 s. Wait for it, then for the scroll hint to settle.
  await page.waitForTimeout(8000);
  await page.addStyleTag({
    content:
      'nav[aria-label="Sections"], div[class*="ScrollHint"], div[class*="hint"], div[class*="cursor"] { display: none !important }',
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log(`Wrote ${path.relative(process.cwd(), out)} from ${url}`);
}

void main();
