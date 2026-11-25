"use client";

import { ChevronsUpDown, ExternalLink, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/me-provider";
import { THEME_OPTIONS } from "@/components/theme-toggle";
import { Avatar, cn, Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, useToast } from "@/components/ui";
import { useThemePreference } from "@/components/use-theme-preference";
import { PUBLIC_API } from "@/lib/api";
import type { ThemePreference } from "@/lib/theme";

/**
 * Avatar button with the account actions. `compact` shows only the avatar (phone top bar);
 * otherwise the GitHub login is shown next to it (bottom of the sidebar).
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const [theme, setTheme] = useThemePreference();

  async function signOut() {
    try {
      const res = await fetch(`${PUBLIC_API}/auth/logout`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      router.replace("/");
      router.refresh();
    } catch {
      toast({ title: "Sign out failed", description: "The server could not be reached. Try again.", tone: "danger" });
    }
  }

  return (
    <Menu
      align={compact ? "end" : "start"}
      trigger={
        <button
          type="button"
          className={cn(
            "flex items-center gap-2.5 rounded-control text-left transition-colors duration-150 hover:bg-sheet/60",
            compact ? "p-1" : "w-full p-2",
          )}
        >
          {/* The name is the button's label (what people see is what they can say to voice control), then its purpose. */}
          <span aria-hidden className="contents"><Avatar name={me.displayName} src={me.avatarUrl} size={compact ? 30 : 32} /></span>
          {compact ? (
            <span className="sr-only">{me.displayName}, account menu</span>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {me.displayName}<span className="sr-only">, account menu</span>
              </span>
              <ChevronsUpDown aria-hidden size={15} className="text-graphite" />
            </>
          )}
        </button>
      }
    >
      <MenuLabel>Signed in as {me.displayName}</MenuLabel>
      {me.isPublished && (
        <MenuItem icon={<ExternalLink size={15} />} onSelect={() => window.open(`/${me.slug}`, "_blank", "noopener")}>
          View public page
        </MenuItem>
      )}
      <MenuItem icon={<Settings size={15} />} onSelect={() => router.push("/settings")}>Settings</MenuItem>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <MenuRadioItem key={value} value={value} icon={<Icon size={15} />}>{label}</MenuRadioItem>
        ))}
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem icon={<LogOut size={15} />} onSelect={signOut}>Sign out</MenuItem>
    </Menu>
  );
}
