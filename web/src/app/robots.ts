import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Public pages may be indexed; the signed-in app and the sign-in page may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/settings", "/welcome", "/login", "/dev"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
