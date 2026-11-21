/** The public address of the web app (no trailing slash), for absolute links such as the sitemap. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
