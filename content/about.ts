/**
 * All copy for the iMac "About" act lives here. Port of the prototype's
 * Stage 1 text. Figures follow BUILD_SPEC.md section 7.
 */

export interface TextRun {
  text: string;
  strong?: boolean;
}

export type ChipIconName = "pin" | "cap" | "code";

export interface IconChip {
  icon: ChipIconName;
  label: string;
}

export const menuBar = {
  mark: "RG",
  owner: "Pasindu",
  items: ["About", "Work", "Activity", "Contact"],
  status: "Available for projects",
  city: "Bangkok",
} as const;

export const about = {
  eyebrow: "01 — Hello, I'm",
  nameFirst: "Pasindu Mahen",
  nameLast: "Walakuluarachchi",
  lede: [
    { text: "Full-stack developer building " },
    { text: "systems & data platforms", strong: true },
    { text: ". I designed and run " },
    { text: "Kai-Flo", strong: true },
    {
      text: ", a multi-tenant platform in production with two Siam University units, and I lead ",
    },
    { text: "KaYo Devs", strong: true },
    {
      text: ", shipping client platforms across Thailand, New Zealand and Sri Lanka.",
    },
  ] satisfies TextRun[],
  chips: [
    { icon: "pin", label: "Bangkok, Thailand" },
    { icon: "cap", label: "BSc IT, First Class Honours" },
    { icon: "code", label: "Next.js · Supabase · TypeScript" },
  ] satisfies IconChip[],
  portrait: {
    src: "/img/portrait.jpg",
    alt: "Portrait of Pasindu in a white hood, lit by warm side light",
    width: 1000,
    height: 1333,
    fileName: "pasindu.jpg",
    captionLeft: "Bangkok · 2026",
    captionRight: "1000 × 1333",
  },
} as const;

export interface EducationItem {
  title: string;
  when: string;
  where: string;
  tag?: string;
}

export const education = {
  eyebrow: "02 — Education",
  titleLead: "Learned the",
  titleEmphasis: "fundamentals",
  titleTail: "properly.",
  gpa: { value: "3.55", unit: "GPA" },
  gpaNote: ["First Class Honours", "Graduated May 2026"],
  items: [
    {
      title: "BSc Information Technology",
      when: "Grad. May 2026",
      where: "Siam University International College, Bangkok",
      tag: "First Class Honours · GPA 3.55",
    },
    {
      title: "Higher National Diploma, Business IT",
      when: "2020 — 2022",
      where: "University of Greenwich (UK)",
    },
  ] satisfies EducationItem[],
} as const;

export interface JourneyItem {
  year: string;
  title: string;
  body: string;
}

export const journey = {
  eyebrow: "03 — Journey",
  titleLead: "From the",
  titleEmphasis: "edit suite",
  titleTail: "to the database.",
  note: "I started out telling stories with a camera. Now I build the systems people run their work on. Same habit either way: obsess over the details nobody notices until they break.",
  items: [
    {
      year: "2019",
      title: "Behind the camera",
      body: "3+ years of freelance video editing for YouTube and weddings, plus design and DJI drone work.",
    },
    {
      year: "2020",
      title: "HND, Business IT",
      body: "University of Greenwich (UK). The first serious step into software.",
    },
    {
      year: "2022",
      title: "BSc IT at SUIC, Bangkok",
      body: "Built a hospital management system in C#, a car dealership site and a digital games store. Led the Photography Club and ran its competition and exhibition.",
    },
    {
      year: "2025",
      title: "Founded RG Devs",
      body: "Custom platforms for small businesses, now growing into KaYo Devs.",
    },
    {
      year: "2026",
      title: "First Class Honours, Kai-Flo goes live",
      body: "Graduated with a GPA of 3.55, joined the SUIC IT department, and put Kai-Flo into production.",
    },
  ] satisfies JourneyItem[],
} as const;

export interface RoleItem {
  title: string;
  when: string;
  where: string;
  bullets: string[];
}

export const now = {
  eyebrow: "04 — Right now",
  titleLines: ["Two jobs,", "one obsession:", "systems that hold up."],
  /** Index of the italic line. */
  emphasisLine: 1,
  roles: [
    {
      title: "Systems & Software Developer",
      when: "2026 — now",
      where: "Siam University International College · IT Department",
      bullets: [
        "Run Kai-Flo in production on live academic data",
        "Built the clash-free IT timetable for Jan–May 2027",
        "Lead the Digital Tree Inventory pilot: 200 QR-tagged campus trees",
      ],
    },
    {
      title: "Founder · Full-Stack Developer",
      when: "2025 — now",
      where: "KaYo Devs (formerly RG Devs)",
      bullets: [
        "Custom platforms for small businesses on Next.js, Supabase and Vercel",
        "Clients in Thailand, New Zealand and Sri Lanka",
      ],
    },
  ] satisfies RoleItem[],
} as const;

export interface ToolkitGroup {
  title: string;
  items: string[];
}

export const toolkit = {
  eyebrow: "05 — Toolkit",
  titleLead: "Frontend to",
  titleEmphasis: "database.",
  offClockTitle: "Off the clock",
  offClock: [
    "Photography",
    "Gaming PC builds",
    "DJI drone pilot",
    "Video editing",
    "English · Sinhala",
  ],
  groups: [
    {
      title: "Frontend",
      items: ["Next.js", "React", "TypeScript", "Tailwind", "Framer Motion", "GSAP"],
    },
    {
      title: "Backend & data",
      items: [
        "PostgreSQL",
        "Supabase",
        "Row-Level Security",
        "REST APIs",
        "Import pipelines",
      ],
    },
    {
      title: "Platform & AI",
      items: ["Vercel", "GitHub", "Resend", "Anthropic API", "Claude Code", "MCP"],
    },
    {
      title: "Design",
      items: ["Figma", "Photoshop", "Premiere Pro", "After Effects", "Lightroom"],
    },
  ] satisfies ToolkitGroup[],
} as const;
