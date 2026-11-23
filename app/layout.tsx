import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import { SmoothScroll } from "@/lib/smooth-scroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE_URL }],
  creator: SITE.name,
  keywords: [
    "full-stack developer",
    "Next.js",
    "Supabase",
    "TypeScript",
    "Bangkok",
    "portfolio",
    "Kai-Flo",
    "KaYo Devs",
  ],
  alternates: { canonical: "/" },
  // The card image is app/opengraph-image.png (see scripts/capture-og.ts).
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F2F0EC",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
