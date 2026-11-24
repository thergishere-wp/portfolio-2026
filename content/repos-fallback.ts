import type { RepoSummary } from "../lib/github-types";

/**
 * Shown in the repositories window when the live list is not available (no
 * GitHub token on this deployment, an empty answer, or the network failed).
 * PUBLIC repositories only, with the descriptions GitHub already shows; there
 * is no push time, so none is displayed. Refresh it by hand now and then.
 */
export const fallbackRepos: RepoSummary[] = [
  {
    name: "portfolio-2026",
    private: false,
    description: "Personal portfolio: a scroll-driven white room with an iMac and an iPhone",
    language: "TypeScript",
    languageColor: "#3178C6",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/portfolio-2026",
  },
  {
    name: "denova-technologies",
    private: false,
    description:
      "Denova Technologies Ltd — Industrial Machinery Solutions website (Sri Lanka & Bangladesh)",
    language: "TypeScript",
    languageColor: "#3178C6",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/denova-technologies",
  },
  {
    name: "lankanessence",
    private: false,
    description: "Lankan Essence — Bespoke Sri Lanka Travel",
    language: "TypeScript",
    languageColor: "#3178C6",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/lankanessence",
  },
  {
    name: "admission-pretest",
    private: false,
    description: "LCIC Pre-Admission Test Management Platform",
    language: "TypeScript",
    languageColor: "#3178C6",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/admission-pretest",
  },
  {
    name: "rgdevs",
    private: false,
    description: "RG Devs — Premium web platform development service",
    language: "TypeScript",
    languageColor: "#3178C6",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/rgdevs",
  },
  {
    name: "Portfolio",
    private: false,
    description: "My first portfolio, kept for the record",
    language: "CSS",
    languageColor: "#663399",
    pushedAt: "",
    url: "https://github.com/thergishere-wp/Portfolio",
  },
];
