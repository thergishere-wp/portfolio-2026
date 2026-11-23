import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// One page. No lastModified: reading the clock here would make the route dynamic.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: "monthly", priority: 1 }];
}
