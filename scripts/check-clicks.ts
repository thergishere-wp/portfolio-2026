/**
 * Real-mouse interaction test (CDP input events, hit-tested by Chrome, not
 * element.click()). Run against a production build:
 *
 *   npm run build && npm run start -- -p 3100        (another terminal)
 *   npm run check:clicks -- [url]
 *
 * It checks that every interactive thing can be clicked where the user meets
 * it, that nothing inactive sits above it, and that the repositories list
 * hands the wheel back to the page:
 *   - each About dock icon opens its window
 *   - a name in the Projects list scrolls to that project
 *   - the unlocked project screen opens the viewer
 *   - the phone's Pushes and Location tabs in Activity switch
 *   - the wheel over the repositories list scrolls the list, then the page
 *   - Kai-Flo's hero is painted (not blank) while its page fades in
 */
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3100";
const outDir = path.join(process.cwd(), "scroll-report", "clicks");
const W = 1470;
const H = 812;
const results: { name: string; ok: boolean; detail: string }[] = [];
const record = (name: string, ok: boolean, detail = ""): void => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
};

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await context.newPage();
  await page.goto(base + "/?debug&still&hour=12", { waitUntil: "networkidle" });
  await page.keyboard.press("Shift");
  await page.waitForFunction("window.__foldState?.ready === true", null, { timeout: 180_000 });
  await page.waitForTimeout(3500);
  await page.mouse.move(W / 2, H / 2);

  // A CDP wheel can reach the page scaled by the display's pixel ratio.
  await page.evaluate(
    "window.__w = []; addEventListener('wheel', (e) => window.__w.push(e.deltaY), { capture: true, passive: true });",
  );
  await page.mouse.wheel(0, 40);
  await page.waitForTimeout(300);
  const k = (((await page.evaluate("window.__w[0]")) as number) ?? 40) / 40;
  const wheel = (dy: number): Promise<void> => page.mouse.wheel(0, dy / k);
  const jump = async (y: number, wait = 3500): Promise<void> => {
    await page.evaluate(`window.__lenis.scrollTo(${y}, { immediate: true, force: true })`);
    await page.waitForTimeout(wait);
  };
  const step = (): Promise<number> => page.evaluate("window.__story.step") as Promise<number>;
  const scrollY = (): Promise<number> => page.evaluate("scrollY") as Promise<number>;

  /** The centre of an element and whether the thing under it is the element (or inside it). */
  const where = async (
    selector: string,
  ): Promise<{ x: number; y: number; hit: boolean; top: string }> =>
    page.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { x: 0, y: 0, hit: false, top: 'missing' };
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const top = document.elementFromPoint(x, y);
      const chain = []; for (let n = top; n && chain.length < 4; n = n.parentElement) chain.push(n.tagName.toLowerCase() + '.' + String(n.className).split(' ')[0] + (n.style && n.style.zIndex ? '[z' + n.style.zIndex + ']' : ''));
      return { x, y, hit: !!top && (el === top || el.contains(top)), top: chain.join(' < ') };
    })()`);

  // ---- 1. About dock: every icon, with a real click ---------------------------------
  await jump(800);
  const dockCount = await page.locator("[data-dock] button").count();
  for (let i = 0; i < dockCount; i++) {
    const sel = `[data-dock] li:nth-child(${i + 1}) button`;
    const label = (await page.locator(sel).getAttribute("aria-label")) ?? String(i);
    const at = await where(sel);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(900);
    const open = (await page.locator(sel).getAttribute("aria-expanded")) === "true";
    record(
      `dock: ${label}`,
      at.hit && open,
      at.hit ? (open ? "opened" : "did not open") : `covered by ${at.top}`,
    );
    if (open) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
    }
  }

  // ---- 2. Project list names scroll to that project ----------------------------------
  await jump(2.6 * H);
  for (const [name, nth, expectStep] of [
    ["Lanka N Beyond", 3, 8],
    ["Ceylora", 5, 10],
    ["Kai-Flo", 1, 6],
  ] as const) {
    const sel = `[data-p]:nth-child(${nth}) button`;
    const at = await where(sel);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(2600);
    const s = await step();
    record(
      `project list: ${name} scrolls to its project`,
      at.hit && s === expectStep,
      `step ${s}, expected ${expectStep}${at.hit ? "" : ", covered by " + at.top}`,
    );
  }

  // ---- 3. The unlocked project screen opens the viewer -------------------------------
  await jump(4.1 * H);
  {
    const sel = "[data-inner] button[aria-label^='Open']";
    const at = await where(sel);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(1500);
    const viewer = (await page.locator("iframe[title$='(interactive)']").count()) > 0;
    record(
      "phone screen opens the project viewer",
      at.hit && viewer,
      at.hit ? (viewer ? "opened" : "no viewer") : `covered by ${at.top}`,
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1500);
  }

  // ---- 4. Activity phone tabs ---------------------------------------------------------
  await jump(6.75 * H);
  for (const tab of ["pushes", "location", "summary"]) {
    const sel = `#phone-tab-${tab}`;
    const at = await where(sel);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(700);
    const selected = (await page.locator(sel).getAttribute("aria-selected")) === "true";
    record(
      `phone tab: ${tab}`,
      at.hit && selected,
      at.hit ? (selected ? "selected" : "not selected") : `covered by ${at.top}`,
    );
  }

  // ---- 5. Wheel over the repositories list: the list, then the page -------------------
  await jump(6.75 * H);
  {
    const box = await page.locator("[data-repos] ul").boundingBox();
    const dims = (await page.evaluate(
      "(() => { const u = document.querySelector('[data-repos] ul'); return [u.scrollHeight, u.clientHeight]; })()",
    )) as number[];
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const overflow = dims[0] > dims[1] + 1;
    let listMovedFirst = false;
    let pageMovedAfter = false;
    const y0 = await scrollY();
    for (let i = 0; i < 30; i++) {
      await wheel(100);
      await page.waitForTimeout(350);
      const top = (await page.evaluate(
        "document.querySelector('[data-repos] ul').scrollTop",
      )) as number;
      const y = await scrollY();
      if (i === 0 && overflow && top > 0 && Math.abs(y - y0) < 2) listMovedFirst = true;
      const atEnd = !overflow || top >= dims[0] - dims[1] - 1;
      if (atEnd && y - y0 > 50) {
        pageMovedAfter = true;
        break;
      }
    }
    record(
      "wheel over the repos list: list scrolls, then hands over to the page",
      overflow ? listMovedFirst && pageMovedAfter : pageMovedAfter,
      `${overflow ? "list overflows" : "list fits"} ${dims.join("/")}; list moved first: ${listMovedFirst}; page moved after: ${pageMovedAfter}`,
    );
  }

  // ---- 6. Kai-Flo's hero is painted while its page fades in --------------------------
  {
    await jump(0.01, 1500);
    // Real ticks from the top, as a visitor scrolls, to just past the unlock
    // (step 6, where the lock slides away and Kai-Flo's page is revealed).
    const unlockAt = ((await page.evaluate("window.__story.thresholds[6]")) as number) + 10;
    while ((await scrollY()) < unlockAt) {
      await wheel(100);
      await page.waitForTimeout(220);
    }
    const spreadOf = async (name: string | null): Promise<number> => {
      const png = await page.screenshot({
        type: "png",
        clip: { x: 760, y: 280, width: 560, height: 260 },
      });
      if (name) writeFileSync(path.join(outDir, name), png);
      return (await page.evaluate(`(async () => {
        const img = new Image(); img.src = 'data:image/png;base64,${png.toString("base64")}'; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0;
        for (let p = 0; p < d.length; p += 16) { const l = 0.3 * d[p] + 0.6 * d[p + 1] + 0.1 * d[p + 2]; s += l; s2 += l * l; n++; }
        const m = s / n; return Math.sqrt(s2 / n - m * m);
      })()`)) as number;
    };
    const samples: { y: number; spread: number }[] = [];
    // From the moment the lock has gone (0.9 s), through the rest of Kai-Flo's step.
    await page.waitForTimeout(1100);
    for (let i = 0; i < 4; i++) {
      const y = await scrollY();
      const spread = await spreadOf(i === 0 ? "kaiflo-hero-first.png" : null);
      samples.push({ y, spread: Math.round(spread * 10) / 10 });
      await wheel(100);
      await page.waitForTimeout(500);
    }
    // A blank hero (nav only) has almost no variation; a painted one is full of it.
    const blank = samples.filter((s) => s.spread < 25);
    record(
      "Kai-Flo hero painted right after the unlock",
      blank.length === 0,
      samples.map((s) => `${Math.round(s.y)}:${s.spread}`).join(" "),
    );
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(results, null, 1));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
