# Portfolio — Build Spec

Personal portfolio for **Pasindu Mahen Walakuluarachchi**. A light "white room", heavily animated, scroll-driven site told through two devices: an iMac (About + Projects) and an iPhone (Activity + Contact).

**Source of truth:** `reference/prototype.html` (open it in a browser). It holds the approved layout, copy, pacing and the GSAP timelines. **Port it; don't redesign it.** Where this spec and the prototype differ, this spec wins.

- Desktop-first. Mobile is out of scope for now (see the end).
- Hosting: Vercel, on the default `*.vercel.app` URL. No custom domain yet.
- Repo: new **public** GitHub repo `thergishere-wp/portfolio-2026` (the code itself is part of the portfolio).

---

## 1. Stack

| Area | Choice |
|---|---|
| Framework | Next.js (latest), App Router, **TypeScript strict** |
| Styling | Tailwind CSS v4. Complex visual CSS (room, glass, device bodies) may live in CSS modules. **No inline style objects** except values computed at runtime (layout vars, transforms). |
| Motion | `gsap` + `ScrollTrigger` + `@gsap/react` (`useGSAP`), `lenis` for smooth scroll |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` (iPhone only) |
| Map | `maplibre-gl` + OpenFreeMap tiles (free, no key) |
| Fonts | `next/font`: Instrument Serif (display), Geist + Geist Mono (UI and mono). Project screens also use IBM Plex Sans, Space Grotesk and DM Sans. |
| Data | GitHub REST + GraphQL from server route handlers |

No paid services. Everything stays on free tiers.

## 2. Structure

```
app/
  layout.tsx            fonts, metadata, <SmoothScroll> provider
  page.tsx              composes the stages
  api/github/activity/route.ts
  api/github/repos/route.ts
components/
  chrome/  Room.tsx Grain.tsx Cursor.tsx SideNav.tsx ScrollHint.tsx
  intro/   Intro.tsx              (RG preloader → iMac outline → hand-off)
  stage1/  Stage1.tsx Imac.tsx ImacScreen.tsx MenuBar.tsx
           about/ AboutPanel.tsx EducationPanel.tsx JourneyPanel.tsx NowPanel.tsx ToolkitPanel.tsx
           projects/ ProjectsAct.tsx ProjectList.tsx ProjectWindow.tsx ProjectPreview.tsx OverviewCard.tsx ProjectViewer.tsx Lock.tsx
  stage3/  Stage3.tsx PhoneCanvas.tsx PhoneModel.tsx PhoneScreen.tsx
           screen/ LogoScreen.tsx AppScreen.tsx ActivityFeed.tsx ContributionGrid.tsx LocationMap.tsx SocialsScreen.tsx
           ReposWindow.tsx
content/   about.ts projects.ts socials.ts   (all copy lives here, typed)
lib/       useStageLayout.ts  smooth-scroll.tsx  github.ts  time.ts
public/    img/portrait.jpg  models/iphone.glb  shots/*.png
scripts/   capture-shots.ts
```

Keep components small with one job each. All copy from the prototype moves into `content/*.ts`.

## 3. Global behaviour

- **Room background** (fixed): the gradients, floor, cove, window-light "sun" with its mask, vignette and grain, exactly as in the prototype. The sun drifts gently against the cursor (`gsap.quickTo`).
- **Smooth scroll:** Lenis (`lerp: .085`). Drive it from `gsap.ticker`, forward its scroll events to `ScrollTrigger.update`, and set `lagSmoothing(0)`. Lock scrolling (`lenis.stop()` plus `overflow:hidden`) until the intro finishes. Set `history.scrollRestoration = 'manual'` and start at the top.
- **Custom cursor:** a small ink dot. It grows into a violet "OPEN" disc over an unlocked project window. Hide it until the first pointer move, and on touch devices.
- **Side nav** (right edge): About / Work / Activity / Contact. Each button scrolls to a timeline label: `st.start + (st.end - st.start) * label / tl.duration()`. Highlight the active section.
- **Live Bangkok clock** wherever the prototype shows one (`Intl.DateTimeFormat`, `Asia/Bangkok`).
- **Resize:** recompute the layout and call `ScrollTrigger.refresh()` (debounced). Every tween value that depends on size is a function, with `invalidateOnRefresh: true`.
- **Reduced motion:** when `prefers-reduced-motion: reduce`, skip the intro and pinning and show each section as a plain static layout.

## 4. Stage 1: iMac (About → Projects)

### 4.1 Layout math (port `layout()` into `useStageLayout`)
- The screen aspect is clamped: `ars = clamp(vh/vw, .56, .66)`. The iMac never looks squished, whatever the window shape.
- `Ws = min(vw*.46, vh*.7 / (ars + 2*.026 + .1 + .15 + .018))`, `Hs = Ws*ars`. Bezel `.026`, chin `.1`, neck `.15`, foot `.018` (all × Ws).
- Zoom scale `S = max(vw/Ws, vh/Hs)` (cover). The screen content is rendered at `Ws*S × Hs*S` and scaled by `1/S`, so at full zoom it is pixel-crisp at 1:1.
- A centred **safe box** of exactly `vw × vh` inside the screen holds all content, so nothing important is cropped at full zoom.
- Set the iMac's transform origin to the screen centre. Zoom target: `scale S`, `y = vh/2 - (top + b + Hs/2)`.

### 4.2 Intro (time-based, not scroll)
1. "RG" letters rise in; the violet dot pops in and blinks (CSS steps animation).
2. The iMac outline draws itself (SVG paths with `pathLength=1`, dash offset 1 → 0, staggered).
3. The body and stand fade in, the outline fades out, and the screen powers on.
4. The loader's "RG" flies into the screen (FLIP: measure both marks, then tween x/y/scale), then swaps with the on-screen mark.
5. The scroll hint appears; scrolling unlocks.
Wait for `document.fonts.ready` before measuring.

### 4.3 Scroll timeline (one pinned, scrubbed timeline)
Pin `#stage1`, `scrub: 1`, `end: '+=' + vh * tl.duration() * 0.6`. Timings are the prototype's; keep them.
1. Zoom into the display (1.2 units). The RG mark blurs out; the menu bar and the About panel come in.
2. Scroll *inside* the screen through five panels: **About → Education → Journey → Right now → Toolkit**. The track moves `-vh` per panel (1 unit each, then a short hold), and each panel's `.rv` items stagger in.
3. Zoom out: the iMac goes to the back of the room (`scale .74`, `opacity .3`, `blur 6px`) and the screen returns to a faint RG.
4. Projects act (section 4.4).

### 4.4 Projects act
Three columns: the **project list** (left), a **floating overview card** (middle, overlapping the window edge slightly) and the **glass browser window** (right). Order:

1. **Kai-Flo**, kaiflo.app
2. **KaYo Devs**, kayodev.com (not live yet, so show a "Launching soon" card)
3. **Lanka N Beyond**, lankanbeyond.com
4. **Denova Technologies**, denovatec.com
5. **Ceylora**, ceylora.co.nz

For each project, in order: its name rises in **black**; the previous name greys out (`#B4B0A9`), and the previous preview and card leave. The lock resets, then the current name turns **violet** (`#5B3DF5`). The lock shackle lifts and swings open and the lock fades. The **live homepage** fades in inside the window, and the overview card pops in. Overview copy and tags come from the prototype.

**Live preview inside the window:**
- An `<iframe>` rendered at a virtual 1440×900, scaled with `transform: scale()` to fit the window body. It uses `pointer-events: none`, `loading="lazy"`, `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, `referrerPolicy="no-referrer"`, and `tabIndex={-1}`.
- Only the current project's iframe is mounted, plus the next one, which is preloaded.
- **Fallback:** `public/shots/<id>.png`, captured by `scripts/capture-shots.ts` (Playwright, 1440×900, homepage after network idle). Use the screenshot when a site can't be framed. Decide per project with a `frameable` flag in `content/projects.ts`, kept accurate by checking headers at build time (see the next item).
- `scripts/check-frameable.ts`: fetch each URL and inspect `x-frame-options` and the CSP `frame-ancestors`; print the results. Run it before each deploy.
- Kai-Flo shows its **login page only**. It has no data on it.
- The URL bar shows the current project's domain, or `locked` before the first unlock.

**Click the window to expand** (`ProjectViewer`): a FLIP from the window's rect to 90vw × 90vh in the centre, over a blurred backdrop. Inside is the same site as an **interactive** iframe (pointer events on), with a bar holding the URL, **Open in new tab ↗** and **Close (Esc)**. Pause Lenis while it is open. Closing reverses the FLIP. KaYo Devs (not live) shows its card and "Launching soon".

## 5. Stage 3: iPhone (Activity → Contact)

The section after Stage 1 scrolls in naturally, so the whole iMac act moves up and away. Then pin `#stage3` (scrubbed, about 7 vh of scroll).

### 5.1 The 3D phone
- An R3F `<Canvas>` with a transparent background, over the room. Camera fov about 30. Lighting: drei `<Environment preset="studio">` (or a soft custom setup) plus `<ContactShadows>` on the floor, so it sits in the white room.
- **Model:** a realistic modern iPhone-style GLB in `public/models/iphone.glb`. It **must** have a licence that allows use (CC0 or CC-BY; credit CC-BY in the footer). Compress it with `gltf-transform` (meshopt/draco), aiming for under 3 MB. The visible **USB-C port and speaker holes** on the bottom edge matter. Show **no Apple logo** (remove or hide that mesh).
- **Fallback if no suitably licensed model exists:** build it procedurally. Use a drei `RoundedBox` body (titanium-white PBR), a screen plane, a bottom edge with a port and speaker holes, and a camera bump. That is acceptable, but it must look solid and lit, not flat.
- **Screen:** drei `<Html transform occlude="blending">` attached to the screen plane and rendering `<PhoneScreen />`. This is real DOM, so it is clickable and crisp. Match its size to the screen mesh and give it rounded corners.
- **Scroll poses** (GSAP tweens a group ref's rotation, position and scale):
  1. Start: bottom edge toward the camera, so the charging port is clearly visible. Roughly `rotation.x ≈ +1.3`, `y ≈ -0.35`, `z ≈ 0.12`, `scale .62`, a little lower.
  2. It **stands upright**, facing the camera, showing the RG logo screen (blinking dot).
  3. It moves left (about -22% of the viewport width). The screen crossfades to the app, and the **Repositories** glass window slides in from the right.
  4. A hold, so people can use the tabs and scroll the repos list.
  5. The repos window leaves; the phone returns to centre and **rotates to landscape** (`z = -π/2`) while scaling up. The screen shows Socials, laid out upright for landscape and clear of the Dynamic Island. The headline "Let's build *something.*" and the email line appear.

### 5.2 Phone app (portrait)
- A status bar (live Bangkok time), the header (avatar, "Pasindu", `@thergishere-wp`), and a segmented control **Activity | Location** with a sliding knob.
- **Activity tab:**
  - A **contribution grid** from the GitHub GraphQL `contributionsCollection` (last ~20 weeks, violet scale).
  - A **live feed of real pushes**, newest first. Each row shows the repo, the message (public repos only), the commit count and a relative time.
  - **Private repos show a lock, the repo name and "N commits · private repository". Never show messages for private repos.**
  - The feed polls every 60 s, and new rows slide in. The header reads "Live · last push 6m ago".
- **Location tab:** a real **MapLibre** map using the OpenFreeMap `positron` style, centred on Bangkok (`[100.5018, 13.7563]`, zoom about 11.5) with a custom pulsing violet marker. Below it: Based in Bangkok, Thailand · local time · Home: Sri Lanka · Clients: TH · NZ · LK. Load the map lazily, only when the tab opens.

### 5.3 Repositories window (right)
A glass window titled "06 — Activity · Repositories / What I'm *building.*", with a scrollable list (`data-lenis-prevent`). Each repo shows its name, description, language colour dot and "Updated X ago". **Public repos are links** (open GitHub in a new tab). **Private repos show a lock and a "Private" badge and are not clickable** (`cursor: not-allowed`).

### 5.4 Socials (landscape screen)
"Say *hello.*" plus a sub-line, then five app-style icons **spread evenly** in a 5-column grid. Each icon is the logo only, with **the profile handle under it** (not the platform name):

| Platform | Handle shown | Link |
|---|---|---|
| Instagram | @li_rg_il | https://www.instagram.com/li_rg_il |
| Facebook | Pasindu Walakuluarachchi *(confirm the exact name)* | https://www.facebook.com/share/1BqZNuECk4/ |
| LinkedIn | pasindu-walakuluarachchi | https://www.linkedin.com/in/pasindu-walakuluarachchi-697939390/ |
| GitHub | thergishere-wp | https://github.com/thergishere-wp |
| Email | walakulu.pasindu@gmail.com | mailto:walakulu.pasindu@gmail.com |

Each icon has an `aria-label` with the platform name. External links use `target="_blank" rel="noopener"`.

## 6. GitHub data (server only)

Environment variables (Vercel and `.env.local`; never committed, never sent to the client):
- `GITHUB_TOKEN`: a fine-grained personal access token. Resource owner: thergishere-wp; repository access: **All repositories**; permissions: **Metadata: read**, **Contents: read**. Nothing else.
- `GITHUB_USER=thergishere-wp`

`GET /api/github/repos`: `GET /user/repos?affiliation=owner&sort=pushed&per_page=50`. Return `{ name, private, description, language, pushedAt, url }`. For private repos, set `url: null` and `description: null` unless the repo is listed in an allow-list in `content/projects.ts` (so client repos never leak descriptions by accident).

`GET /api/github/activity`:
- Take the 12 most recently pushed repos. For each, `GET /repos/{owner}/{repo}/commits?author={user}&since=<14 days ago>&per_page=20`.
- Merge into "push groups" (same repo, commits within 30 minutes) and sort newest first.
- Shape: `{ repo, private, count, message: string | null, url: string | null, at }`. For **private** repos, set `message: null` and `url: null`, **stripped on the server**.
- The contribution calendar comes from GraphQL `viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } }`.
- Cache with `fetch(..., { next: { revalidate: 60 } })`. On a GitHub error, return the last good data with `stale: true`; the UI then reads "Live · reconnecting".
- **No mock data in production.** If the token is missing, the feed shows an empty state, not fake rows.

## 7. Content (from the prototype, plus resume, plus verified Kai-Flo figures)

- **About:** name, lede, chips, portrait (`public/img/portrait.jpg`, the white-hood photo).
- **Education:** BSc IT, SUIC Bangkok, First Class Honours, GPA 3.55, graduated May 2026. HND Business IT, University of Greenwich (UK), 2020–2022.
- **Journey:** 2019 video/design/drone → 2020 HND → 2022 BSc and student projects (hospital management system in C#, car dealership site, digital games store, Photography Club leader) → 2025 founded RG Devs → 2026 First Class Honours, Kai-Flo in production, joined SUIC IT.
- **Right now:** Systems & Software Developer at SUIC IT (2026–now); Founder of KaYo Devs (2025–now).
- **Toolkit** plus **Off the clock** (photography, gaming PC builds, DJI drone, video editing, English · Sinhala).
- **Kai-Flo stats (verified Nov 2026):** 144 tables, all with row-level security · 223 security policies (220 on tables + 3 on storage) · 449 real student records planned · 0 timetable clashes, built in about 20 ms. Describe it as "in production with two Siam University units". **Do not** claim the test suite is all green.

## 8. Quality bar

- TypeScript strict. No `any`. Production-ready error and loading states.
- Lazy-load heavy parts: the R3F canvas and MapLibre via `next/dynamic` with `ssr: false`; iframes only when needed.
- Desktop Lighthouse: Performance ≥ 85, Accessibility ≥ 95.
- Semantic HTML: one `h1` (the name), headings in order, alt text, real buttons and links, a visible focus style.
- No secrets in the repo. `.env.local` is in `.gitignore`.
- No emojis in the UI; SVG icons only.

## 9. Things only Pasindu can do

1. Create the GitHub fine-grained token (section 6) and paste it into Vercel → Project → Settings → Environment Variables as `GITHUB_TOKEN`.
2. Allow embedding on his own sites (prompt in `PROMPTS.md`, Phase 2b), using the final `*.vercel.app` URL of this portfolio.
3. Confirm the Facebook display name.

## 10. Out of scope (later)

Mobile layout · live chat (Supabase Realtime) · Kai-Flo fictional-data demo (`demo.kaiflo.app`) · custom domain (when bought: update the `frame-ancestors` on each project site, then add the domain in Vercel).
