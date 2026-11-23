/**
 * A tiny stand-in for the GitHub API, for testing the activity pipeline
 * without a real token.
 *
 *   npm run mock:github            serves on http://127.0.0.1:4010
 *   GITHUB_API_URL=http://127.0.0.1:4010 GITHUB_TOKEN=mock npm run dev
 *
 * It requires `Authorization: Bearer mock`. Private repos carry messages that
 * start with SECRET so a test can prove they never reach the client.
 *   GET /__fail?on=1   make every request fail with 500 (test the stale path)
 *   GET /__fail?on=0   recover
 *   GET /__push        add a brand-new public commit (a new feed row)
 */
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4010);
let failing = false;
let pushedNow = false;

// Fixed at start-up so timestamps are stable between calls, like real commits.
const START = Date.now();
const ago = (minutes: number): string =>
  new Date(START - minutes * 60_000).toISOString();
let pushAt = "";
let pushedPrivate = false;
let pushPrivateAt = "";

const repos = () => [
  { name: "portfolio-2026", private: false, description: "This site. White room, iMac, iPhone.", language: "TypeScript", pushed_at: ago(6), updated_at: ago(6), html_url: "https://github.com/thergishere-wp/portfolio-2026", owner: { login: "thergishere-wp" } },
  { name: "kaiflo", private: true, description: "SECRET private description", language: "JavaScript", pushed_at: ago(40), updated_at: ago(40), html_url: "https://github.com/thergishere-wp/kaiflo", owner: { login: "thergishere-wp" } },
  { name: "lanka-n-beyond", private: true, description: "SECRET another description", language: "TypeScript", pushed_at: ago(180), updated_at: ago(180), html_url: "https://github.com/thergishere-wp/lanka-n-beyond", owner: { login: "thergishere-wp" } },
  { name: "Portfolio", private: false, description: "My first portfolio, kept for the record.", language: "PHP", pushed_at: "2025-03-02T10:00:00Z", updated_at: "2025-03-02T10:00:00Z", html_url: "https://github.com/thergishere-wp/Portfolio", owner: { login: "thergishere-wp" } },
  { name: "empty-repo", private: false, description: null, language: null, pushed_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z", html_url: "https://github.com/thergishere-wp/empty-repo", owner: { login: "thergishere-wp" } },
];

const commit = (message: string, minutesAgo: number, name: string) => ({
  html_url: `https://github.com/thergishere-wp/${name}/commit/${minutesAgo}`,
  commit: { message, author: { date: ago(minutesAgo) }, committer: { date: ago(minutesAgo) } },
});

function commitsFor(name: string) {
  switch (name) {
    case "portfolio-2026":
      // Three commits within 30 minutes of each other = one push group, then a lone later one.
      return [
        commit("feat: real GitHub activity\n\nlong body ignored", 6, name),
        commit("fix: map marker", 12, name),
        commit("chore: tidy", 25, name),
        commit("feat: repos window", 300, name),
      ];
    case "kaiflo":
      return [
        // Appears after GET /__push?private=1 (a push to a private repo).
        ...(pushedPrivate
          ? [{ ...commit("SECRET-PRIVATE-MESSAGE brand new", 0, name), commit: { message: "SECRET-PRIVATE-MESSAGE brand new", author: { date: pushPrivateAt }, committer: { date: pushPrivateAt } } }]
          : []),
        commit("SECRET-PRIVATE-MESSAGE fix timetable clash", 40, name),
        commit("SECRET-PRIVATE-MESSAGE rls policy", 55, name),
      ];
    case "lanka-n-beyond":
      return [commit("SECRET-PRIVATE-MESSAGE visa page", 180, name)];
    case "Portfolio":
      // Appears after GET /__push, so a test can watch a new row arrive.
      return pushedNow
        ? [{ ...commit("feat: shipped something new", 0, name), commit: { message: "feat: shipped something new", author: { date: pushAt }, committer: { date: pushAt } } }]
        : [];
    default:
      return [];
  }
}

/** Deterministic calendar: 53 weeks of 7 days. */
function calendar() {
  const weeks = Array.from({ length: 53 }, (_, w) => ({
    contributionDays: Array.from({ length: 7 }, (_, d) => {
      const seed = (w * 7 + d) * 2654435761;
      const count = (seed >>> 8) % 11 > 6 ? (seed >>> 4) % 14 : 0;
      return { date: `2026-w${w}-d${d}`, contributionCount: count };
    }),
  }));
  // The current week is partial.
  weeks[52].contributionDays = weeks[52].contributionDays.slice(0, 3);
  return { data: { viewer: { contributionsCollection: { contributionCalendar: { weeks } } } } };
}

const send = (res: http.ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (url.pathname === "/__fail") {
      failing = url.searchParams.get("on") === "1";
      return send(res, 200, { failing });
    }
    if (url.pathname === "/__push") {
      if (url.searchParams.get("private") === "1") {
        pushedPrivate = true;
        pushPrivateAt = new Date().toISOString();
        return send(res, 200, { pushedPrivate });
      }
      pushedNow = true;
      pushAt = new Date().toISOString();
      return send(res, 200, { pushedNow });
    }
    if (failing) return send(res, 500, { message: "mock failure" });
    if (req.headers.authorization !== "Bearer mock") {
      return send(res, 401, { message: "Bad credentials" });
    }

    if (url.pathname === "/user/repos") return send(res, 200, repos());
    if (url.pathname === "/graphql" && req.method === "POST") return send(res, 200, calendar());

    const match = url.pathname.match(/^\/repos\/[^/]+\/([^/]+)\/commits$/);
    if (match) {
      if (match[1] === "empty-repo") return send(res, 409, { message: "Git Repository is empty." });
      return send(res, 200, commitsFor(match[1]));
    }
    return send(res, 404, { message: "Not Found" });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Mock GitHub API on http://127.0.0.1:${PORT}`);
  });
