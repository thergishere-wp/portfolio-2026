/**
 * Contact copy and the five social links. Per BUILD_SPEC.md section 5.4 each
 * icon shows the profile handle, not the platform name.
 */

export type SocialId = "instagram" | "facebook" | "linkedin" | "github" | "email";

export interface Social {
  id: SocialId;
  /** For the accessible label. */
  platform: string;
  /** Shown under the logo. */
  handle: string;
  href: string;
  external: boolean;
}

export const contact = {
  eyebrow: "07 — Contact",
  titleLead: "Let's build",
  titleEmphasis: "something.",
  screenLead: "Say",
  screenEmphasis: "hello.",
  screenSub: "Projects, collaborations, or just a good idea.",
  emailLead: "Or write directly:",
  email: "walakulu.pasindu@gmail.com",
} as const;

export const socials: Social[] = [
  {
    id: "instagram",
    platform: "Instagram",
    handle: "@li_rg_il",
    href: "https://www.instagram.com/li_rg_il",
    external: true,
  },
  {
    id: "facebook",
    platform: "Facebook",
    // TODO(Pasindu): confirm the exact Facebook display name.
    handle: "Pasindu Walakuluarachchi",
    href: "https://www.facebook.com/share/1BqZNuECk4/",
    external: true,
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    handle: "pasindu-walakuluarachchi",
    href: "https://www.linkedin.com/in/pasindu-walakuluarachchi-697939390/",
    external: true,
  },
  {
    id: "github",
    platform: "GitHub",
    handle: "thergishere-wp",
    href: "https://github.com/thergishere-wp",
    external: true,
  },
  {
    id: "email",
    platform: "Email",
    handle: contact.email,
    href: `mailto:${contact.email}`,
    external: false,
  },
];
