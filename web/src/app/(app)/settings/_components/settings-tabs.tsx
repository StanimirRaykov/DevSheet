"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, Dialog, Tabs } from "@/components/ui";
import type { SettingsTab } from "./settings-tab-names";
import { UnsavedChangesContext } from "./unsaved-changes";

/**
 * The four settings tabs. The open tab is kept in the address (?tab=), so a link or a reload lands on it.
 * Switching away from a tab with unsaved changes asks first; so does leaving the page.
 */
export function SettingsTabs({ initialTab, panels }: { initialTab: SettingsTab; panels: Record<SettingsTab, ReactNode> }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [pending, setPending] = useState<SettingsTab | null>(null);
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());

  const report = useCallback((key: string, isDirty: boolean) => {
    setDirty((current) => {
      if (current.has(key) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const hasUnsaved = dirty.size > 0;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  function open(next: SettingsTab) {
    setTab(next);
    setPending(null);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url);
  }

  return (
    <UnsavedChangesContext.Provider value={report}>
      <Tabs
        label="Settings"
        value={tab}
        onValueChange={(value) => (hasUnsaved ? setPending(value as SettingsTab) : open(value as SettingsTab))}
        items={[
          { value: "account", label: "Account", content: panels.account },
          { value: "sign-in", label: "Sign-in and GitHub", content: panels["sign-in"] },
          { value: "public-page", label: "Public page", content: panels["public-page"] },
          { value: "delete", label: "Delete account", content: panels.delete },
        ]}
      />
      <Dialog
        open={pending !== null}
        onOpenChange={(isOpen) => !isOpen && setPending(null)}
        title="Discard unsaved changes?"
        description="You changed something on this tab and did not save it. Switching tabs discards the change."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>Keep editing</Button>
            <Button variant="danger" onClick={() => pending && open(pending)}>Discard changes</Button>
          </>
        }
      />
    </UnsavedChangesContext.Provider>
  );
}
