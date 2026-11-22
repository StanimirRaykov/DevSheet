"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { THEME_OPTIONS } from "@/components/theme-toggle";
import { Avatar, Button, Field, Input, cn, useToast } from "@/components/ui";
import { useThemePreference } from "@/components/use-theme-preference";
import { send, type FieldErrors } from "@/lib/client";
import { SettingsLoadError, SettingsLoading, SettingsSection } from "./settings-section";
import { useUnsavedChanges } from "./unsaved-changes";

export interface Account {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export function AccountTab() {
  const [account, setAccount] = useState<Account | null | "error">(null);

  useEffect(() => {
    send<Account>("/api/me/account").then((r) => setAccount(r.data ?? "error"));
  }, []);

  if (account === null) return <SettingsLoading />;
  if (account === "error") return <SettingsLoadError />;
  return (
    <div>
      <AccountForm saved={account} onSaved={setAccount} />
      <SettingsSection
        title="Picture"
        description="Comes from the provider you signed up with. Change it there and sign in again to update it here."
      >
        <div className="flex items-center gap-4">
          <Avatar name={account.displayName} src={account.avatarUrl} size={56} />
          <p className="text-sm text-graphite">
            {account.avatarUrl ? "Your picture from your sign-in provider." : "Your initials, because your sign-in provider has no picture."}
          </p>
        </div>
      </SettingsSection>
      <ThemeSection />
    </div>
  );
}

export function AccountForm({ saved, onSaved }: { saved: Account; onSaved: (account: Account) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(saved.displayName);
  const [email, setEmail] = useState(saved.email ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const dirty = displayName !== saved.displayName || email !== (saved.email ?? "");
  useUnsavedChanges("account", dirty);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await send<Account>("/api/me/account", "PATCH", { displayName, email });
    setSaving(false);
    if (r.data) {
      setErrors({});
      setDisplayName(r.data.displayName);
      setEmail(r.data.email ?? "");
      onSaved(r.data);
      toast({ title: "Account saved", tone: "success" });
      router.refresh(); // the name in the user menu
    } else if (r.status === 400) {
      setErrors(r.errors);
    } else {
      toast({ title: "Your account was not saved", description: "Try again in a moment.", tone: "danger" });
    }
  }

  return (
    <SettingsSection title="Name and email" description="How DevSheet addresses you, and where it can reach you.">
      <form onSubmit={save} noValidate className="flex max-w-md flex-col gap-4">
        <Field label="Display name" hint="Shown in the app and on your public page when your profile has no full name." error={errors.displayName?.[0]}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="name" />
        </Field>
        <Field
          label="Contact email"
          hint="Private, for messages about your account. It does not sign you in. The email on your CV is set in Profile."
          error={errors.email?.[0]}
        >
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <div>
          <Button type="submit" disabled={!dirty} loading={saving}>Save changes</Button>
        </div>
      </form>
    </SettingsSection>
  );
}

function ThemeSection() {
  const [preference, choose] = useThemePreference();
  return (
    <SettingsSection title="Theme" description="Saved on this device. System follows your computer's light or dark setting.">
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-control border border-rule bg-sheet p-0.5">
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(value)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-[4px] px-3 text-sm transition-colors duration-150",
                selected ? "bg-accent-soft text-accent" : "text-graphite hover:text-ink",
              )}
            >
              <Icon aria-hidden size={15} strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
