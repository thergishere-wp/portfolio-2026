# Portfolio — Build Spec

Personal portfolio for **Pasindu Mahen Walakuluarachchi**. A light "white room", heavily animated, scroll-driven site told through two devices: an iMac (About + Projects) and one **foldable phone** (Projects, then Activity and Contact).

**Source of truth:** `reference/prototype.html` (open it in a browser) holds the approved layout, copy and look. **Port it; don't redesign it.** Where this spec and the prototype differ, this spec wins. This round (pace, continuity, the foldable) changed the scroll model and everything below the iMac; the prototype's iPhone and glass browser window no longer exist.

- Desktop-first. Mobile is out of scope for now (see the end).
- Hosting: Vercel, on the default `*.vercel.app` URL. No custom domain yet.
- Repo: **public** GitHub repo `thergishere-wp/portfolio-2026` (the code itself is part of the portfolio).

---

## 1. Stack

| Area | Choice |
|---|---|
| Framework | Next.js (latest), App Router, **TypeScript strict** |
| Styling | Tailwind CSS v4. Complex visual CSS (room, glass, device bodies) may live in CSS modules. **No inline style objects** except values computed at runtime (layout vars, transforms, measured sizes). |
| Motion | `gsap` + `ScrollTrigger` + `@gsap/react` (`useGSAP`), `lenis` for smooth scroll (no snapping) |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` (the foldable only, procedural: no model file) |
| Map | `maplibre-gl` + OpenFreeMap tiles (free, no key) |
| Fonts | `next/font`: Instrument Serif (display), Geist + Geist Mono (UI and mono). Project screens also use IBM Plex Sans, Space Grotesk and DM Sans. |
| Data | GitHub REST from server route handlers |

No paid services. Everything stays on free tiers.

## 2. Structure

```
app/
  layout.tsx            fonts, metadata, <SmoothScroll> provider
  page.tsx              composes the chrome and <Stage1 /> (the whole story)
  api/github/activity/route.ts
  api/github/repos/route.ts
components/
  chrome/  Room.tsx Dust.tsx Grain.tsx Cursor.tsx SideNav.tsx ScrollHint.tsx
  intro/   Intro.tsx              (RG on the page → iMac outline → RG inside the screen)
  stage1/  Stage1.tsx             ONE pinned section: iMac, Projects DOM, the canvas, repos, contact copy
           aboutTimeline.ts       camera (iMac zoom) + About steps
           projects/projectsTimeline.ts   Projects steps S0-S7
           deviceTimeline.ts      fold shut / port-first / upright / landscape + Activity and Contact steps
           Imac.tsx ImacScreen.tsx MenuBar.tsx
           about/ AboutPanel.tsx EducationPanel.tsx JourneyPanel.tsx NowPanel.tsx ToolkitPanel.tsx
           desktop/ Desktop.tsx Dock.tsx DockIcons.tsx AppWindow.tsx ResumeApp.tsx
           projects/ ProjectsAct.tsx ProjectList.tsx OverviewCard.tsx ProjectViewer.tsx LaunchingSoonCard.tsx frame.ts
  story/   StoryCanvas.tsx        the page's ONE R3F canvas (lights, studio, rig, Suspense silhouette, context loss)
           FoldModel.tsx fold-geometry.ts   the procedural foldable
           fold-screen.ts         screenshot textures + the five screen-transition shaders
           InnerScreen.tsx        DOM over the open inner screen: live iframes, lock, click target
           CoverScreen.tsx        DOM on the cover screen: lock screen, phone app, socials
           DynamicIsland.tsx
  stage3/  ReposWindow.tsx Stage3Static.tsx phone-geometry.ts (measureScreen)
           screen/ AppScreen.tsx SummaryScreen.tsx ActivityRings.tsx TimeChart.tsx MostActive.tsx
                   ActivityFeed.tsx LocationMap.tsx MapView.tsx SocialsScreen.tsx
content/   about.ts projects.ts socials.ts   (all copy lives here, typed)
lib/       step-driver.ts scroll-budget.ts fold-rig.ts island-store.ts webgl.ts useNear.ts
           useStageLayout.ts smooth-scroll.tsx github.ts activity-stats.ts room-light.ts time.ts
public/    img/portrait.jpg img/event-camera.jpg  cv.pdf (a placeholder)  shots/<id>.png <id>-fold.jpg
scripts/   capture-shots.ts (--fold)  check-frameable.ts  check-continuity.ts  check-3d.ts  phone-corners.ts  mock-github.ts
```

Keep components small with one job each. All copy lives in `content/*.ts`.

## 3. Global behaviour

- **Room background** (fixed): the gradients, floor, cove, window-light "sun" with its mask, vignette and grain, as in the prototype. The sun drifts gently against the cursor (`gsap.quickTo`).
- **A living room** (subtle; all of it is off under `prefers-reduced-motion`): a pale oak desk and keyboard slab as children of the iMac; soft leaf shadows and 26 drifting dust specks; real Bangkok time of day written to CSS variables on `<html>` every 30 s (`lib/room-light.ts`; `?hour=21.5` previews a time).
- **The scroll model (applies to everything):**
  - **Scrub only camera moves**: the iMac's zoom in and out, and the device's rotation, fold and travel. `scrub: true` (Lenis is the only smoothing, so a frame never depends on how fast it was reached).
  - **Every content change is a function of one `step` value.** `step` is the last threshold the scroll position has crossed (`components/stage1/storySteps.ts`, thresholds in vh from the budget below). The state of every element (list visible/active/past, which project's screen, the overview card and its content, the lock, the phone's fold state, which cover layer) is a pure table of `step`, applied by lanes (`lib/step-driver.ts`): when the step changes a lane kills its own in-flight tweens (`overwrite: "auto"`) and tweens to the new state in 0.5-0.8 s, so fast scrolling cannot stack animations and **the same position gives the same frame from either direction**. Nothing is toggled in separate onEnter/onLeave callbacks. One owner per property: the scrub owns the camera and exit moves, steps own content.
  - **No snapping, ever.** The user always controls the position (Lenis `lerp: 0.1`, `wheelMultiplier: 1`); it settles within a few hundred ms of the last input, with no drift. One 100 px wheel tick never crosses more than one step.
  - **Orientation follows the phone's actual rotation**: the socials' landscape layout, the island's orientation and the cover layers' visibility read `rig.rz` (landscape only when |rz| > pi/4) and the hinge angle, never the step, so reversing cannot show rotated content on an upright phone.
  - **One pin.** The whole story is one pinned section, so there is no pin-spacing handoff between stages.
- **Scroll budget** (`lib/scroll-budget.ts`, one timeline unit = one viewport height; top of page to Contact is **8.1 vh, must stay ≤ 8.5**): zoom in 0.8 · About stop 0.6 · zoom out 0.5 · Projects: enter 0.5, list 0.5, first project + unfold 0.5, unlock 0.5, each next project 0.45 (×4) · fold → Activity 1.0 (scrubbed: card, list, title leave, the phone folds port-first and stands on the left) · Activity hold 0.6 · landscape → Contact 0.8 (scrubbed; the repos leave in the last 0.25 vh of the hold).
- **Smooth scroll:** Lenis (`lerp: 0.1`, `wheelMultiplier: 1`) driven from `gsap.ticker`, forwarded to `ScrollTrigger.update`, `lagSmoothing(0)`. Locked (`lenis.stop()` + `overflow:hidden`) until the intro finishes. `history.scrollRestoration = 'manual'`.
- **Custom cursor:** a small ink dot; over an openable project screen it grows into a violet "OPEN" disc. Hidden until the first pointer move and on touch.
- **Side nav** (right edge): About / Work / Activity / Contact, each scrolling to a timeline label (about 1.4, work 2.05, activity 6.7, contact 8.1 vh).
- **Live Bangkok clock** wherever the prototype shows one (`Intl.DateTimeFormat`, `Asia/Bangkok`).
- **Resize:** recompute the layout and `ScrollTrigger.refresh()` (debounced); step positions are functions, re-read on refresh.
- **Reduced motion, or no WebGL:** skip the intro, pinning and the 3D scene and show each section as a plain static layout (`StaticStage` + `Stage3Static`).
- **One WebGL canvas.** It is mounted once, when the intro is done and the browser is idle (`requestIdleCallback`), after the WebGL check, the texture preload and the scene's chunk prefetch; scrolling never unmounts it in either direction (the device is scaled to nothing, not removed). It renders from mount until the real model is up (its first frame announces it), then 2 s more so the shaders compile while the device is still hidden, and after that only while the story is on screen and near the device, so the device is ready long before Projects. A plain slab (in the canvas while textures load, in the DOM while the canvas loads) stands in for the device; `webglcontextlost` is prevented and the DOM slab shows until `webglcontextrestored`. A texture that fails to load becomes a placeholder, never a missing device.

## 4. Stage 1: iMac (About → Projects)

### 4.1 Layout math (`useStageLayout`)
- The screen aspect is clamped: `ars = clamp(vh/vw, .56, .66)`. The iMac never looks squished.
- `Ws = min(vw*.46, vh*.7 / (ars + 2*.026 + .1 + .15 + .018))`, `Hs = Ws*ars`. Bezel `.026`, chin `.1`, neck `.15`, foot `.018` (all × Ws).
- Zoom scale `S = max(vw/Ws, vh/Hs)` (cover). Screen content is rendered at `Ws*S × Hs*S` and scaled by `1/S`, so at full zoom it is pixel-crisp at 1:1. A centred **safe box** of exactly `vw × vh` holds all content.
- The iMac's transform origin is the screen centre. Zoom target: `scale S`, `y = vh/2 - (top + b + Hs/2)`.

### 4.2 Intro (time-based, not scroll)
Nothing travels across the screen: each step happens where it ends up. 0.0 s "RG" and the violet dot centred, the dot blinking three times · 1.6 s "RG" dissolves in place · 2.1 s the iMac outline draws itself (1.2 s) · 3.2 s body and stand fill in, the screen powers on · 3.8 s "RG" and the dot fade in **inside the screen**, at its exact centre · 4.4 s the scroll hint appears and scrolling unlocks. Returning visitors in the same session (a `sessionStorage` flag in try/catch) get a 1.2 s version. Any key or click jumps to the end state. Wait for `document.fonts.ready`.

### 4.3 The story's first half (About)
Camera (scrubbed): 0-1.0 vh the iMac zooms into the display; 1.4-1.9 vh it zooms out to the back of the room (`scale .74`, `opacity .3`, `blur 6px`). Steps (rests at 1.0, 1.4, 1.9 vh):
1. During the zoom: the RG mark blurs out; the menu bar, About window and its contents come in.
2. At the first rest the dock rises (the About stop; 0.4 vh).
3. As the zoom out begins the desktop leaves, the screen is a faint RG again and the background glows come in.

`overflow: clip`, not `hidden`, on the stage, the screen and the safe box.

### 4.5 The About desktop (a macOS-style stop)
- After the zoom-in the **About window** (name, lede, chips, **photo window**) is open by default. The photo window is sized from the photo's own aspect (**1000 × 1333, 3:4**) with `object-fit: cover` and never crops the face; its caption is two separate items, "Bangkok · 2026" and "1000 × 1333".
- A **dock** is centred at the bottom: glass, SVG icons, real labelled buttons: Education, Journey, Now, Toolkit, Résumé. Hover or focus shows the label; the open app has a dot under its icon.
- Clicking an icon opens that app as a **window** (traffic lights, title bar, content from `content/about.ts`) that scales up from the icon. **One app window at a time**; the red light and **Esc** close it. **Résumé** opens a **Download CV (PDF)** button linking to `/cv.pdf` (a placeholder until the real CV is supplied).
- **Journey** shows a small tilted photo card (`public/img/event-camera.jpg`, the B&W event photo, AVIF/WebP through `next/image`, with alt text) beside "2019 — Behind the camera".
- A small violet dot under the dock pulses with "Open the apps in the dock" until the first click.
- Accessibility: windows are `role="dialog"` with `aria-modal`, a name and a **focus trap**; focus returns to the icon on close; **Lenis is paused** while a window is open.

### 4.4 Projects act (the foldable, stepped and clickable)
Three columns: the **title and list** (left, DOM), a **floating overview card** (middle, overlapping the device slightly, DOM) and the **3D foldable** (right, the story's canvas). Order: **Kai-Flo** (kaiflo.app, the public landing page at "/"), **KaYo Devs** (kayodev.com, live), **Lanka N Beyond**, **Denova Technologies**, **Ceylora**.

Steps (each a time-based timeline, played on entering and reversed on leaving; rests at 2.2, 2.5, 2.9, 3.2, 3.55, 3.9, 4.25, 4.6 vh):
- **S0 enter (0.3):** only the "Projects" title; the **folded** device floats in on the right. Its cover screen is a lock screen (Bangkok time, a lock icon, "Scroll to unlock").
- **S1 list (0.3):** all five names drop in at once (stagger).
- **S2 first (0.4):** Kai-Flo turns violet; the device **unfolds** (hinge 180° → 0° in 0.9 s, turning toward the camera). The inner screen shows the project's screenshot texture (`public/shots/<id>-fold.jpg`) mapped across both halves. The lock appears on the open screen.
- **S3 unlock (0.3):** the lock plays (shackle lifts and swings) and the screen cross-fades from the screenshot to the **live homepage**; the overview card pops in.
- **S4-S7 (0.35 each):** the previous name greys out (`#B4B0A9`), the new one turns violet (`#5B3DF5`), the card swaps, the live page steps aside and a transition **unique to that project** plays over the screenshots, then the new live page fades in. No lock, no buffer.
  - KaYo Devs: app-switcher swipe (cards slide sideways) · Lanka N Beyond: soft horizontal page-turn wipe · Denova: blueprint grid scan line revealing the page top to bottom · Ceylora: arch-shaped iris reveal.
- **Clicking a project name** scrolls straight to its step (`lenis.scrollTo`), so nobody is forced through all of them.
- **Live pages:** an `<iframe>` laid out at the inner screen's pixel size (1024 wide, a tablet viewport), `pointer-events: none`, `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, `referrerPolicy="no-referrer"`, `tabIndex={-1}`, hidden until loaded. **Only the current and the next are mounted**, and only once the story is near. The DOM is clipped to the mesh's measured shape and corner radius. `scripts/check-frameable.ts` keeps the per-project `frameable` flag honest; `npm run shots -- --fold` makes the tablet shots.
- **Click the open inner screen** to open `ProjectViewer`: a FLIP from the screen's on-screen rectangle to 90vw × 90vh over a blurred backdrop, with an interactive **desktop-size** iframe, the URL, **Open in new tab ↗** and **Close (Esc)**. Lenis is paused while it is open; closing reverses the FLIP. 

## 5. The foldable: Projects, Activity and Contact

### 5.1 The 3D model (procedural, one device)
Built in R3F, no model file, no brand names or logos, shared materials and about 10k triangles: two rounded **titanium-white halves** on a hinge, thin bezels, a camera island and side buttons, a **USB-C port and speaker holes** on the cover half's bottom edge, an **outer cover screen** on the right half. Each half is 1.03 × 1.55 units; unfolded the inner screen is about 4:3. The right half folds forward about a pivot on the screen plane, so the two inner screens end up face to face. Lighting: a soft studio built from light panels plus `ContactShadows` on the floor.

State lives in `lib/fold-rig.ts` (a plain object the timelines tween and the scene reads every frame): the pose (`x y rx ry rz scale shadow`) and `shut` are scrubbed; `show unfold turn trans from to chip open frames lock app social apps` are tweened by steps. The hinge angle is `PI × (1 − unfold × (1 − shut))`, so the time-based unfold and the scrubbed fold never share a field.

**Screens** are real DOM, sized and clipped from the meshes (`measureScreen`: the geometry's bounding box and the corner radius of its flat top edge, then the DOM pixel size and drei's `distanceFactor`; nothing hand-typed):
- the **cover screen** (390 px wide) uses drei `<Html transform occlude="blending">` with the mesh's rounded outline as the occlusion hole. drei resets the canvas's z-index when a non-blending `<Html>` mounts, so `FoldModel` reasserts it;
- the **inner screen** overlay (1024 px wide) is a non-occluded `<Html>` above the canvas, shown only when the device is open and flat. Below it the shader draws the screenshots across both halves, with the five transitions.

### 5.2 Activity and Contact (the rest of the story)
- **Fold shut → Activity phone (0.8 vh, scrubbed):** the device **folds shut** (0 → 180°), tilts back to show its bottom edge with the USB-C port and speaker holes (the port-first moment), then stands upright on the left (about −22% of the width, 72% of the height). The Projects section moves up and away during this (no gap) and the iMac leaves the room. A step cross-fades the cover from the lock screen to the app.
- **Activity hold (0.6 vh):** the **Repositories** window slides in on the right.
- **Turn to landscape → Contact (0.6 vh, scrubbed):** the device returns to centre and turns to landscape (`rz = −π/2`); a step brings the socials onto the cover screen, the headline "Let's build *something.*" and the email line, and takes the repos away.

### 5.3 Phone app (cover screen, portrait)
- A status bar (live Bangkok time), the header (avatar, "Pasindu", `@thergishere-wp`), and a segmented control **Summary | Pushes | Location** with a sliding knob.
- **Summary ("Screen Time for code"):** light, Apple-minimal, violet and neutrals. It scrolls inside the phone (`data-lenis-prevent`). Everything is counted from real commit timestamps (`lib/activity-stats.ts`, Bangkok time); no data means an empty state, never fake numbers. Rings (commits today of 8, active days of 7, repos touched of 5), a Day | Week coding-time chart with the peak in violet, and the top four repos of the week (private ones show a lock).
- **Pushes:** a live feed of real pushes, newest first; the feed polls every 60 s. **Private repos show a lock, the repo name and "N commits · private repository". Never messages.**
- **Location:** a real MapLibre map (OpenFreeMap `positron`, Bangkok, `[100.5018, 13.7563]`, zoom about 11.5) with a pulsing violet marker, loaded lazily when the tab opens.

### 5.4 Repositories window (right)
A glass window "06 — Activity · Repositories / What I'm *building.*" with a scrollable list (`data-lenis-prevent`): name, description, language dot, "Updated X ago". **Public repos are links; private repos show a lock and a "Private" badge and are not clickable.**

### 5.5 Socials (landscape cover screen)
"Say *hello.*" plus a sub-line, then five app-style icons spread evenly, each with **the profile handle under the logo**: Instagram `@li_rg_il` · Facebook `Pasindu Walakuluarachchi` *(confirm the exact name)* · LinkedIn `pasindu-walakuluarachchi` · GitHub `thergishere-wp` · Email `walakulu.pasindu@gmail.com`. Each icon has an `aria-label` with the platform name; external links use `target="_blank" rel="noopener"`. The content is laid out upright for landscape and reserves room for the expanded island.

### 5.6 The Dynamic Island (live status)
Drawn inside the clipped cover screen:
- **Idle:** a small pill with a pulsing green dot.
- **A new real push** (the 60 s poll; the first load only sets the baseline): it springs open (overshoot) to the repo's icon and "kaiflo · +3 commits" for about 4 s, then collapses. **Private repos show a lock and the name only, never a message.**
- **Tap:** "Last push 6m ago · Bangkok 21:33".
- **Contact (landscape):** "Available for projects"; hovering or focusing a social icon morphs it to that handle.
- `prefers-reduced-motion`: no spring (the size changes at once), the text cross-fades. A polite live region announces pushes.

## 6. GitHub data (server only)

Environment variables (Vercel and `.env.local`; never committed, never sent to the client): `GITHUB_TOKEN` (fine-grained, owner thergishere-wp, **All repositories**, **Metadata: read**, **Contents: read**, nothing else) and `GITHUB_USER=thergishere-wp`.

`GET /api/github/repos`: `GET /user/repos?affiliation=owner&sort=pushed&per_page=50`, returning `{ name, private, description, language, pushedAt, url }`. For private repos `url` and `description` are null unless allow-listed in `content/projects.ts`.

`GET /api/github/activity`: the 12 most recently pushed repos, each `GET /repos/{owner}/{repo}/commits?author={user}&since=<14 days ago>&per_page=100`, merged into **push groups** (same repo, commits within 30 minutes), newest first: `{ repo, private, count, message | null, url | null, at }`. For **private** repos `message` and `url` are **stripped on the server**. It also returns `commits`: every commit as a bare `{ repo, private, at }` (never a message or URL), which the Summary screen and the island count. Cache with `fetch(..., { next: { revalidate: 60 } })`; on a GitHub error return the last good data with `stale: true` ("Live · reconnecting"). **No mock data in production**: with no token the feed shows an empty state.

`npm run mock:github` is a stand-in GitHub for tests (`/__push`, `/__push?private=1`, `/__fail?on=1`).

## 7. Content (from the prototype, plus resume, plus verified Kai-Flo figures)

- **About:** name, lede, chips, portrait (`public/img/portrait.jpg`, the white-hood photo, 1000 × 1333).
- **Education:** BSc IT, SUIC Bangkok, First Class Honours, GPA 3.55, graduated May 2026. HND Business IT, University of Greenwich (UK), 2020–2022.
- **Journey:** 2019 video/design/drone (with the event photo) → 2020 HND → 2022 BSc and student projects (hospital management system in C#, car dealership site, digital games store, Photography Club leader) → 2025 founded RG Devs → 2026 First Class Honours, Kai-Flo in production, joined SUIC IT.
- **Right now:** Systems & Software Developer at SUIC IT (2026–now); Founder of KaYo Devs (2025–now).
- **Toolkit** plus **Off the clock** (photography, gaming PC builds, DJI drone, video editing, English · Sinhala).
- **Kai-Flo stats (verified Nov 2026):** 144 tables, all with row-level security · 223 security policies (220 on tables + 3 on storage) · 449 real student records planned · 0 timetable clashes, built in about 20 ms. Describe it as "in production with two Siam University units". **Do not** claim the test suite is all green.

## 8. Quality bar

- TypeScript strict. No `any`. Production-ready error and loading states.
- Lazy-load heavy parts: the R3F canvas and MapLibre via `next/dynamic` with `ssr: false`; iframes only when needed.
- **Desktop Lighthouse: Performance ≥ 90**, Accessibility ≥ 95.
- Semantic HTML: one `h1` (the name), headings in order, alt text, real buttons and links, a visible focus style.
- No secrets in the repo. `.env.local` is in `.gitignore`.
- No emojis in the UI; SVG icons only.
- **Tests that must pass before a deploy** (dev server on :3100):
  - `npm run check:continuity -- <out> [url] [w h] [samples]` samples N positions down then up, diffs screenshots and the animated DOM state, and must report 0 mismatches (it hides live iframes, which animate on their own).
  - `npm run check:3d -- [runs] [url] [out]`: fresh context, Fast 4G, hard load, a jump straight to Projects and to Activity; the real device must be up every run.
  - `npm run check:frameable`, `npm run check:phone -- <out>` (zoomed corners of the cover screen).

## 9. Things only Pasindu can do

1. Create the GitHub fine-grained token (section 6) and paste it into Vercel as `GITHUB_TOKEN`.
2. Allow embedding on his own sites (prompt in `PROMPTS.md`, Phase 2b), using the final `*.vercel.app` URL of this portfolio.
3. Confirm the Facebook display name.
4. Supply the real CV (`public/cv.pdf`).

## 10. Out of scope (later)

Mobile layout · live chat (Supabase Realtime) · Kai-Flo fictional-data demo (`demo.kaiflo.app`) · custom domain (when bought: update the `frame-ancestors` on each project site, then add the domain in Vercel).
