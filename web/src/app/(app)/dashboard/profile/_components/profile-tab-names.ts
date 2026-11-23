// Shared by the server page (reads ?tab=) and the client view, so it must not be in a "use client" file.

export const PROFILE_TABS = ["about", "experience", "education", "languages", "certifications"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export function parseProfileTab(value: string | string[] | undefined): ProfileTab {
  const v = Array.isArray(value) ? value[0] : value;
  return PROFILE_TABS.includes(v as ProfileTab) ? (v as ProfileTab) : "about";
}
