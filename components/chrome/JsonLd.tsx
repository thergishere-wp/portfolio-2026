import { socials } from "@/content/socials";
import { SITE, SITE_URL } from "@/lib/site";

/** Profile pages only: the Facebook link is a share link, not a profile URL. */
const PROFILE_IDS = new Set(["instagram", "linkedin", "github"]);

/** schema.org Person data, so search engines can read who this site is about. */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.name,
    url: SITE_URL,
    jobTitle: SITE.jobTitle,
    image: `${SITE_URL}/img/portrait.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bangkok",
      addressCountry: "TH",
    },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "Siam University International College" },
      { "@type": "CollegeOrUniversity", name: "University of Greenwich" },
    ],
    sameAs: socials.filter((s) => PROFILE_IDS.has(s.id)).map((s) => s.href),
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
