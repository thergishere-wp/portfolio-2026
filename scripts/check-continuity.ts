/**
 * Scroll continuity check: the same scroll position must give the same frame
 * whichever direction it was reached from.
 *
 * It scrolls the page to N evenly spaced positions going down, then to the
 * same positions going up, and at every stop it records a screenshot and a
 * signature of the animated DOM (computed opacity, visibility, transform and
 * colour of every [data-*] element). Each down/up pair is then compared, and
 * every mismatch is listed with the elements that differ.
 *
 *   npm run dev -- -p 3100        (in another terminal)
 *   npm run check:continuity -- <outDir> [url] [width height] [samples]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const outDir = process.argv[2] ?? path.join(process.cwd(), "continuity");
const url = process.argv[3] ?? "http://localhost:3100";
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
const samples = Number(process.argv[6] ?? 40);
/** Time for Lenis, the scrub and the step tweens to come to rest. */
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 2600);
/** A pair differs when more than this share of pixels changed noticeably. */
const PIXEL_SHARE = 0.004;

type Signature = Record<string, string>;

const SIGNATURE_SCRIPT = `(() => {
  const sel = '[data-reveal],[data-rv],[data-rv-win],[data-p],[data-ptext],[data-minic],[data-preview],[data-win],[data-lock],[data-shackle],[data-orb],[data-a2-rv],[data-menubar],[data-desktop],[data-dock],[data-about-window],[data-screen],[data-screen-mark],[data-glare],[data-repos],[data-a3c],[data-a3-foot],[data-step]';
  const out = {};
  const counts = {};
  document.querySelectorAll(sel).forEach((el) => {
    const key = [...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-svg-origin').map((a) => a.name + (a.value ? '=' + a.value : '')).join(' ');
    counts[key] = (counts[key] || 0) + 1;
    const cs = getComputedStyle(el);
    const r = (v) => v.replace(/-?\\d+\\.\\d+/g, (n) => String(Math.round(parseFloat(n) * 20) / 20));
    const tf = r(cs.transform).replace('matrix(1, 0, 0, 1, 0, 0)', 'none');
    out[key + '#' + counts[key]] = [r(cs.opacity), cs.visibility, tf, cs.color].join(' | ');
  });
  out['scrollY'] = String(Math.round(window.scrollY));
  return out;
})()`;

async function scrollTo(page: Page, y: number): Promise<void> {
  await page.evaluate((target) => window.scrollTo(0, target), y);
  await page.waitForTimeout(SETTLE_MS);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
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
    deviceScaleFactor: 0.5,
  });
  const page = await context.newPage();
  await page.goto(url + (url.includes("?") ? "&" : "?") + "hour=12", {
    waitUntil: "networkidle",
  });
  // Live pages animate on their own (carousels, video), which is not a scroll
  // effect: hide the iframes so only our own animation is compared.
  await page.addStyleTag({ content: "iframe { visibility: hidden !important; }" });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Shift"); // skip the intro
  await page.waitForTimeout(1200);

  const total = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  const positions = Array.from({ length: samples }, (_, i) =>
    Math.round((i / (samples - 1)) * total),
  );

  const down: { png: Buffer; sig: Signature }[] = [];
  const up: { png: Buffer; sig: Signature }[] = [];

  for (const y of positions) {
    await scrollTo(page, y);
    const pngDown = await page.screenshot();
    writeFileSync(path.join(outDir, `${String(down.length).padStart(2, "0")}-down.png`), pngDown);
    down.push({
      png: pngDown,
      sig: (await page.evaluate(SIGNATURE_SCRIPT)) as Signature,
    });
    process.stdout.write(".");
  }
  for (const y of [...positions].reverse()) {
    await scrollTo(page, y);
    up.unshift({
      png: await page.screenshot(),
      sig: (await page.evaluate(SIGNATURE_SCRIPT)) as Signature,
    });
    process.stdout.write(",");
  }
  process.stdout.write("\n");

  // Pixel diff, computed in the page from the two PNGs. The function is passed
  // as a string: tsx rewrites arrow functions in a way the page cannot run.
  const cmp = await context.newPage();
  await cmp.setContent("<body></body>");
  const DIFF_SCRIPT = `async ([pa, pb]) => {
    const load = async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height);
    };
    const [ia, ib] = await Promise.all([load(pa), load(pb)]);
    let changed = 0;
    for (let i = 0; i < ia.data.length; i += 4) {
      const d = Math.abs(ia.data[i] - ib.data[i]) + Math.abs(ia.data[i + 1] - ib.data[i + 1]) + Math.abs(ia.data[i + 2] - ib.data[i + 2]);
      if (d > 48) changed++;
    }
    return changed / (ia.data.length / 4);
  }`;
  const diffShare = async (a: Buffer, b: Buffer): Promise<number> =>
    (await cmp.evaluate(
      `(${DIFF_SCRIPT})(${JSON.stringify([a.toString("base64"), b.toString("base64")])})`,
    )) as number;

  const report: string[] = [];
  let bad = 0;
  for (let i = 0; i < positions.length; i++) {
    const share = await diffShare(down[i].png, up[i].png);
    const keys = new Set([...Object.keys(down[i].sig), ...Object.keys(up[i].sig)]);
    const stateDiffs: string[] = [];
    for (const k of keys) {
      if (k === "scrollY") continue;
      if (down[i].sig[k] !== up[i].sig[k]) {
        stateDiffs.push(`    ${k}\n      down: ${down[i].sig[k]}\n      up:   ${up[i].sig[k]}`);
      }
    }
    const mismatch = share > PIXEL_SHARE || stateDiffs.length > 0;
    const label = String(i).padStart(2, "0");
    writeFileSync(path.join(outDir, `${label}-down.png`), down[i].png);
    writeFileSync(path.join(outDir, `${label}-up.png`), up[i].png);
    report.push(
      `${mismatch ? "MISMATCH" : "ok      "} #${label} y=${positions[i]} (${(
        positions[i] / height
      ).toFixed(2)} vh) pixels ${(share * 100).toFixed(2)}% state diffs ${stateDiffs.length}`,
    );
    if (mismatch) {
      bad++;
      report.push(...stateDiffs.slice(0, 12));
    }
  }
  report.push(
    `\n${bad} of ${positions.length} positions differ (${width}x${height}, total ${(total / height).toFixed(2)} vh)`,
  );
  const text = report.join("\n");
  writeFileSync(path.join(outDir, "report.txt"), text);
  console.log(text);
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
