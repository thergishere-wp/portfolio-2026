/**
 * Reports which project sites a browser will let this portfolio embed.
 *
 *   npm run check:frameable
 *
 * For each project it fetches the page that is framed, then looks at the
 * response headers a browser enforces:
 *   - Content-Security-Policy: frame-ancestors  (wins over X-Frame-Options)
 *   - X-Frame-Options
 * and compares the result with the `frameable` flag in content/projects.ts.
 * Exits non-zero on a mismatch, so run it before each deploy.
 *
 * PORTFOLIO_ORIGIN overrides the origin that must be allowed.
 */
import { projects, type Project } from "../content/projects";

const PORTFOLIO_ORIGIN =
  process.env.PORTFOLIO_ORIGIN ?? "https://portfolio-2026-wheat-delta.vercel.app";

interface Verdict {
  frameable: boolean;
  reason: string;
  finalUrl: string;
  xFrameOptions: string | null;
  frameAncestors: string | null;
}

/** Does one frame-ancestors source expression allow `origin`? */
function sourceAllows(source: string, origin: string): boolean {
  const s = source.toLowerCase();
  if (s === "*") return true;
  if (s === "'none'" || s === "'self'") return false; // 'self' is the framed site
  const target = new URL(origin);
  const stripped = s.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const host = stripped.split(":")[0];
  const schemeOk = !/^https?:\/\//.test(s) || s.startsWith(`${target.protocol}//`);
  if (!schemeOk) return false;
  if (host.startsWith("*.")) return target.hostname.endsWith(host.slice(1));
  return target.hostname === host;
}

function evaluate(res: Response, origin: string): Verdict {
  const xFrameOptions = res.headers.get("x-frame-options");
  const csp = res.headers.get("content-security-policy");
  const matches = csp ? [...csp.matchAll(/frame-ancestors\s+([^;,]+)/gi)] : [];
  const frameAncestors = matches.length
    ? matches.map((m) => m[1].trim()).join(" | ")
    : null;
  const base = { finalUrl: res.url, xFrameOptions, frameAncestors };

  // Modern browsers ignore X-Frame-Options when frame-ancestors is present.
  if (matches.length) {
    const allowed = matches.every((m) =>
      m[1]
        .trim()
        .split(/\s+/)
        .some((source) => sourceAllows(source, origin)),
    );
    return {
      ...base,
      frameable: allowed,
      reason: allowed
        ? "frame-ancestors allows the portfolio"
        : `frame-ancestors blocks the portfolio (${frameAncestors})`,
    };
  }
  if (xFrameOptions) {
    return {
      ...base,
      frameable: false,
      reason: `X-Frame-Options: ${xFrameOptions}`,
    };
  }
  return { ...base, frameable: true, reason: "no framing restrictions" };
}

async function check(project: Project): Promise<Verdict | null> {
  const url = project.frameUrl;
  if (!url) return null;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (portfolio frame check)" },
    signal: AbortSignal.timeout(20_000),
  });
  return evaluate(res, PORTFOLIO_ORIGIN);
}

async function main(): Promise<void> {
  console.log(`Checking framing for origin ${PORTFOLIO_ORIGIN}\n`);
  let mismatches = 0;

  for (const project of projects) {
    const label = project.name.padEnd(20);
    if (!project.frameUrl) {
      console.log(`${label} skipped (${project.status}, nothing to frame)`);
      continue;
    }
    try {
      const verdict = await check(project);
      if (!verdict) continue;
      const ok = verdict.frameable === project.frameable;
      if (!ok) mismatches += 1;
      console.log(
        `${label} ${verdict.frameable ? "FRAMEABLE" : "BLOCKED  "}  flag=${project.frameable}  ${ok ? "ok" : "MISMATCH"}`,
      );
      console.log(`${"".padEnd(20)} ${verdict.reason}`);
      console.log(`${"".padEnd(20)} ${verdict.finalUrl}`);
    } catch (error) {
      mismatches += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${label} ERROR  ${message}`);
    }
  }

  console.log(
    mismatches === 0
      ? "\nAll frameable flags match."
      : `\n${mismatches} problem(s). Update content/projects.ts or the site's headers.`,
  );
  process.exitCode = mismatches === 0 ? 0 : 1;
}

void main();
