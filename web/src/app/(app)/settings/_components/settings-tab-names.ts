// Shared by the server page (reads ?tab=) and the client tabs, so it must not be in a "use client" file.

export const SETTINGS_TABS = ["account", "sign-in", "public-page", "delete"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function parseSettingsTab(value: string | string[] | undefined): SettingsTab {
  const v = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.includes(v as SettingsTab) ? (v as SettingsTab) : "account";
}
