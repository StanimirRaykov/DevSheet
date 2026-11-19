export interface NavItem {
  href: string;
  label: string;
  /** Overview is active only on its own page; the others also on their sub-pages. */
  exact?: boolean;
}

export const APP_NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/skills", label: "Skills" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/cv", label: "CV" },
  { href: "/settings", label: "Settings" },
];

export function isActive(item: NavItem, pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(item.href + "/");
}
