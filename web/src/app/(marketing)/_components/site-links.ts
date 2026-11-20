/** Links of the public site's navigation and footer, in one place so a test can check every route exists. */
export const REPO_URL = "https://github.com/StanimirRaykov/DevSheet";

/** The public example page (fictional developer, seeded data). */
export const DEMO_SLUG = "demo";

export const NAV_LINKS = [{ href: "/about", label: "About" }] as const;

export const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: REPO_URL, label: "Source code" },
] as const;
