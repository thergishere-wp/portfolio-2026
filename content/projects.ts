/**
 * The projects act. Order matters: it is the order the scroll story reveals
 * them. Copy and tags come from the prototype; Kai-Flo figures are the
 * verified ones from BUILD_SPEC.md section 7.
 *
 * Imported by the app AND by scripts/*.ts, so keep imports relative and
 * free of framework code.
 */

export type ProjectId = "kaiflo" | "kayo" | "lnb" | "denova" | "ceylora";

/** production = in production with real users; live = public site. */
export type ProjectStatus = "production" | "live";

export interface ProjectStat {
  value: string;
  label: string;
}

export interface Project {
  id: ProjectId;
  name: string;
  /** Domain shown in the window's URL bar. */
  domain: string;
  /** Site to open in a new tab. Null while the site is not live. */
  liveUrl: string | null;
  /** The page shown in the window and viewer. Null while not live. */
  frameUrl: string | null;
  /**
   * Whether the site lets this portfolio embed it. When false the screenshot
   * is shown instead. Keep it accurate with `npm run check:frameable`.
   */
  frameable: boolean;
  /** Fallback screenshot in /public/shots, made by `npm run shots`. */
  shot: string | null;
  status: ProjectStatus;
  /** Text on the floating overview card. */
  overview: string;
  tags: string[];
  /** Small caption in the expanded viewer. */
  viewerNote: string | null;
  /** Shown in the expanded viewer. */
  stats?: ProjectStat[];
}

export const projectsAct = {
  eyebrow: "06 — Selected work",
  title: "Projects",
  lockedLabel: "Scroll to unlock",
  openHint: "Click to open",
} as const;

/**
 * Descriptions the repositories window may show for PRIVATE repos, by repo
 * name. Private repos otherwise never expose a description (client repos must
 * not leak by accident). Empty on purpose: add an entry to opt a repo in.
 */
export const privateRepoAllowList: Readonly<Record<string, string>> = {};

export const projects: Project[] = [
  {
    id: "kaiflo",
    name: "Kai-Flo",
    domain: "kaiflo.app",
    liveUrl: "https://kaiflo.app/",
    frameUrl: "https://kaiflo.app/",
    frameable: true,
    shot: "/shots/kaiflo.png",
    status: "production",
    overview:
      "One platform for running an organisation's people, operations and academics. In production with two Siam University units.",
    tags: ["Next.js", "Supabase", "Postgres RLS", "Claude API"],
    viewerNote:
      "The public landing page. The platform itself is private; a demo with fictional data is on the way.",
    stats: [
      { value: "144", label: "database tables, all row-level secured" },
      { value: "223", label: "security policies" },
      { value: "449", label: "real student records planned" },
      { value: "0", label: "timetable clashes, built in about 20 ms" },
    ],
  },
  {
    id: "kayo",
    name: "KaYo Devs",
    domain: "kayodev.com",
    liveUrl: "https://kayodev.com/",
    frameUrl: "https://kayodev.com/",
    frameable: true,
    shot: "/shots/kayo.png",
    status: "live",
    overview:
      "My studio, formerly RG Devs. Brand, web and product builds for small businesses in Thailand, New Zealand and Sri Lanka.",
    tags: ["Studio", "Next.js", "Vercel"],
    viewerNote: null,
  },
  {
    id: "lnb",
    name: "Lanka N Beyond",
    domain: "lankanbeyond.com",
    liveUrl: "https://lankanbeyond.com",
    frameUrl: "https://lankanbeyond.com",
    frameable: true,
    shot: "/shots/lnb.png",
    status: "live",
    overview:
      "Ground-up rebuild of a Sri Lanka tourism site: tour packages on an interactive map, visa support, brochure downloads and WhatsApp enquiries.",
    tags: ["Next.js", "TypeScript", "Framer Motion", "Resend"],
    viewerNote: null,
  },
  {
    id: "denova",
    name: "Denova Technologies",
    domain: "denovatec.com",
    liveUrl: "https://denovatec.com",
    frameUrl: "https://denovatec.com",
    frameable: true,
    shot: "/shots/denova.png",
    status: "live",
    overview:
      "Corporate site for an industrial machinery distributor working across Sri Lanka, Bangladesh, Kenya and New Zealand, with a five-brand product showcase and enquiry system.",
    tags: ["Next.js", "Tailwind", "SEO", "Vercel"],
    viewerNote: null,
  },
  {
    id: "ceylora",
    name: "Ceylora",
    domain: "ceylora.co.nz",
    liveUrl: "https://ceylora.co.nz",
    frameUrl: "https://ceylora.co.nz",
    frameable: true,
    shot: "/shots/ceylora.png",
    status: "live",
    overview:
      "Custom storefront for a New Zealand eyewear and denim label, plus a private invoicing tool that generates branded PDF invoices and keeps customer records.",
    tags: ["Next.js", "Supabase", "react-pdf", "Vercel"],
    viewerNote: null,
  },
];
