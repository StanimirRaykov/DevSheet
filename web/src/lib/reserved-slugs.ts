/**
 * Copy of the API list in api/src/DevSheet.Domain/ReservedSlugs.cs. Public pages live at /<slug>,
 * so a slug must never match a top-level route. reserved-slugs.test.ts keeps both lists and the
 * folders in src/app in step.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "about",
  "account",
  "admin",
  "api",
  "auth",
  "blog",
  "contact",
  "cv",
  "dashboard",
  "dev",
  "docs",
  "help",
  "login",
  "logout",
  "me",
  "new",
  "pricing",
  "privacy",
  "register",
  "settings",
  "signup",
  "static",
  "status",
  "support",
  "terms",
  "welcome",
  "www",
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}
