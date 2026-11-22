"use client";

import { useState } from "react";
import { useMe } from "@/components/me-provider";
import { Button, Dialog, Field, Input, useToast } from "@/components/ui";
import { send } from "@/lib/client";
import { refreshPublicPages } from "../actions";
import { SettingsSection } from "./settings-section";

/** Leaves the app after the account is gone; a full page load, because the session no longer exists. */
// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops everything cached for the deleted session
export const goHome = () => window.location.assign("/");

export function DeleteTab({ onDeleted = goHome }: { onDeleted?: () => void }) {
  const me = useMe();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toLowerCase() === me.slug;

  // Closing in any way (button, Escape, outside click) starts the confirmation over.
  function setDialogOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) setTyped("");
  }

  async function remove() {
    setDeleting(true);
    const r = await send("/api/me", "DELETE");
    if (r.ok) {
      await refreshPublicPages([me.slug]);
      onDeleted();
      return;
    }
    setDeleting(false);
    toast({ title: "Your account was not deleted", description: "Nothing was removed. Try again in a moment.", tone: "danger" });
  }

  return (
    <SettingsSection title="Delete account" description="Permanent. There is no undo and no copy kept.">
      <div className="flex max-w-xl flex-col items-start gap-4">
        <div className="text-sm text-ink">
          <p>Deleting your DevSheet removes, straight away:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-graphite">
            <li>your public page at /{me.slug}, and the address becomes free for anyone;</li>
            <li>your profile, work history, education, languages and certifications;</li>
            <li>your projects, skills and synced repositories;</li>
            <li>your sign-in methods and the GitHub connection with its access token.</li>
          </ul>
          <p className="mt-3 text-graphite">
            Download your CV first if you want to keep it. DevSheet cannot remove itself from your GitHub or Google
            account; you can do that in their settings.
          </p>
        </div>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete account…</Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setDialogOpen}
        title="Delete your DevSheet?"
        description="Everything listed is deleted at once and you are signed out."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Keep my account</Button>
            <Button variant="danger" disabled={!matches} loading={deleting} onClick={remove}>Delete my account</Button>
          </>
        }
      >
        <Field label={`Type ${me.slug} to confirm`}>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="font-code"
          />
        </Field>
      </Dialog>
    </SettingsSection>
  );
}
