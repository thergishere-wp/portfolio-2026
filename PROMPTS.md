# Claude Code prompts: run one phase at a time

Unzip this kit into a new empty folder, open Claude Code there, and paste each prompt in order. After each phase, open the preview, check it against `reference/prototype.html`, and only then move on.

---

## Phase 0: Set up the repo and deploy

```
Read BUILD_SPEC.md fully, then open reference/prototype.html and read its CSS and script so you understand the motion.

Set up the project:
1. Scaffold Next.js (latest, App Router, TypeScript strict, Tailwind v4, ESLint) in this folder. Keep BUILD_SPEC.md, PROMPTS.md and reference/ at the root.
2. Move reference/img/portrait.jpg to public/img/portrait.jpg.
3. Install gsap, @gsap/react, lenis. (Three/R3F and maplibre come in later phases.)
4. Create a PUBLIC GitHub repo thergishere-wp/portfolio-2026 with gh, commit and push.
5. Create a Vercel project linked to that repo and deploy it. Tell me the production *.vercel.app URL.

Do not build any features yet. Stop and report.
```

## Phase 1: Port the prototype (room, intro, iMac, About)

```
Follow BUILD_SPEC.md sections 2, 3 and 4.1–4.3.

Port the white room, grain, cursor, side nav, scroll hint, intro sequence and the full Stage 1 iMac timeline (About, Education, Journey, Right now, Toolkit) from reference/prototype.html into the component structure in the spec. Move all copy into content/about.ts.

Requirements:
- useStageLayout hook with the exact layout math (aspect clamp, cover scale, safe box), recomputed on resize.
- Lenis + ScrollTrigger synced through gsap.ticker; scroll locked until the intro ends.
- useGSAP for every timeline, with function-based values and invalidateOnRefresh.
- Self-hosted fonts with next/font.
- Reduced-motion fallback.

Then run build and lint, and run the dev server. Compare against the prototype at 1440×900, 1280×620 and 1920×1080; the timing and layout should match. Commit, push, and report the preview URL.
```

## Phase 2a: Projects act with live previews

```
Follow BUILD_SPEC.md section 4.4.

Build the projects act: project list, overview card, glass window with the animated lock, in the order Kai-Flo, KaYo Devs, Lanka N Beyond, Denova Technologies, Ceylora.
- Live homepage iframes scaled from a virtual 1440×900, mounting only the current and next project.
- scripts/capture-shots.ts (Playwright) to capture public/shots/<id>.png fallbacks, and scripts/check-frameable.ts to report which sites allow embedding. Run both and show me the results.
- ProjectViewer: click to expand (FLIP) into an interactive browser window with "Open in new tab" and Close/Esc. Pause Lenis while it's open.
- KaYo Devs is live: the preview is https://kayodev.com/ (it was a "Launching soon" card before the launch).

Build, lint, verify in the browser, commit, push, report.
```

## Phase 2b: Allow embedding (run in EACH project's own Claude Code session)

Paste this in the Lanka N Beyond, Denova and Ceylora projects. For Kai-Flo, use the second version.

```
My portfolio at https://<PORTFOLIO>.vercel.app shows this site's homepage inside an iframe. Allow ONLY that origin to frame the site:
- In next.config, add headers() for source '/(.*)' with
  Content-Security-Policy: frame-ancestors 'self' https://<PORTFOLIO>.vercel.app
- Remove any X-Frame-Options header (it would override this).
- Don't change any other security headers. Deploy to production and confirm with curl -I that the header is present.
```

Kai-Flo version:

```
My portfolio at https://<PORTFOLIO>.vercel.app shows Kai-Flo's public LANDING page (the route "/") inside an iframe. Allow framing ONLY for "/" (exactly that one path, not its sub-paths) and only from that origin:
- For the "/" route, set
  Content-Security-Policy: frame-ancestors 'self' https://<PORTFOLIO>.vercel.app
  (the framed page loads its own static assets as sub-resources, which are not framed, so they need no change).
- Every other route (including /login and everything behind it) keeps the current framing protection (DENY / frame-ancestors 'none').
- Don't touch auth, RLS or other headers. Deploy and verify with curl -I on "/" (header present) and on /login and a protected route (still DENY).
```

## Phase 3: 3D iPhone

```
Follow BUILD_SPEC.md section 5.1. Install three, @react-three/fiber, @react-three/drei.

1. Find a realistic modern iPhone-style GLB with a licence that allows use (CC0 or CC-BY). Show me the source and licence before downloading. It needs a visible USB-C port and speaker holes on the bottom edge. Hide or remove any Apple logo. Compress it with gltf-transform to under 3 MB. If nothing suitable is licensed, build the procedural fallback from the spec.
2. Lazy-loaded R3F canvas in Stage 3, with studio lighting and contact shadows so it sits in the white room.
3. Screen content through drei <Html transform occlude="blending"> on the screen plane, so it's real, clickable DOM.
4. The scroll poses from the spec: port-first, stand upright with the RG logo, move left as the app and repos window come in, hold, then centre and rotate to landscape for the socials.
5. Repositories window and Socials screen exactly as specified: handles under logos, spread evenly, clear of the Dynamic Island.

Use placeholder empty states for the feed and map. Real data comes in Phase 4. Build, verify, commit, push, report.
```

## Phase 4: Real GitHub activity and the map

```
Follow BUILD_SPEC.md sections 5.2, 5.3 and 6.

- Route handlers /api/github/repos and /api/github/activity using GITHUB_TOKEN (server only). Private repos: messages, URLs and descriptions stripped on the server. Revalidate every 60 s, with a stale fallback.
- Contribution grid from GraphQL.
- Activity feed that polls every 60 s and animates new pushes in. No mock data anywhere.
- Repos window wired to real data: public repos are links; private repos are locked and not clickable.
- Location tab: MapLibre with the OpenFreeMap positron style, centred on Bangkok, with the pulsing marker, lazy-loaded when the tab opens.

Tell me exactly when to add GITHUB_TOKEN to .env.local and to Vercel. Then build, verify with real data, commit, push, report.
```

## Phase 5: Polish and launch

```
Final pass against BUILD_SPEC.md section 8:
- Lighthouse on the production URL (desktop): Performance ≥ 85, Accessibility ≥ 95. Fix what's below.
- Check the reduced-motion fallback, focus styles, alt text and heading order.
- Metadata, an Open Graph image (the white room with the iMac), favicon (RG with the violet dot).
- Check at 1280×620, 1440×900, 1920×1080 and 2560×1440.
- Deploy to production and give me the URL plus a short list of anything left.
```
