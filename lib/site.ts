/**
 * Site-wide constants. When a custom domain is bought, set NEXT_PUBLIC_SITE_URL
 * (or change the fallback) and update `frame-ancestors` on each project site.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio-2026-wheat-delta.vercel.app";

export const SITE = {
  name: "Pasindu Mahen Walakuluarachchi",
  title: "Pasindu Mahen Walakuluarachchi — Portfolio",
  description:
    "Full-stack developer in Bangkok building systems and data platforms. Designer of Kai-Flo, founder of KaYo Devs. Selected work, journey and contact.",
  jobTitle: "Full-stack developer",
} as const;
