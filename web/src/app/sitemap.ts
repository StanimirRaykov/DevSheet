import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** The public site's own pages. Users' public pages are not listed: publishing is not an invitation to crawlers. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/privacy", "/terms", "/demo"].map((path) => ({ url: siteUrl() + (path === "/" ? "" : path) }));
}
