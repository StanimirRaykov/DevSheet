"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Switch, buttonClasses, cn, useToast } from "@/components/ui";
import { send } from "@/lib/client";
import { refreshPublicPages } from "../actions";
import { SettingsLoadError, SettingsLoading, SettingsSection } from "./settings-section";
import { useUnsavedChanges } from "./unsaved-changes";

export interface PublicPage {
  slug: string;
  isPublished: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showPhone: boolean;
  allowCvDownload: boolean;
}

export interface SlugCheck {
  slug: string;
  status: "Available" | "Current" | "Invalid" | "Reserved" | "Taken";
  message: string | null;
  available: boolean;
}

/** How long typing has to pause before the address is checked. */
export const CHECK_DELAY_MS = 300;

export function PublicPageTab() {
  const [page, setPage] = useState<PublicPage | null | "error">(null);

  useEffect(() => {
    send<PublicPage>("/api/me/public-page").then((r) => setPage(r.data ?? "error"));
  }, []);

  if (page === null) return <SettingsLoading />;
  if (page === "error") return <SettingsLoadError />;
  return (
    <div>
      <AddressForm current={page.slug} published={page.isPublished} onMoved={(slug) => setPage({ ...page, slug })} />
      <Visibility page={page} onChange={setPage} />
    </div>
  );
}

/** The page's address, checked while typing. Moving it frees the old address at once. */
export function AddressForm({ current, published, onMoved }: { current: string; published: boolean; onMoved: (slug: string) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(current);
  const [check, setCheck] = useState<SlugCheck | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typed = value.trim().toLowerCase();
  const changed = typed !== current;
  useUnsavedChanges("address", changed);

  useEffect(() => {
    if (!changed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const r = await send<SlugCheck>(`/api/me/slug-available?slug=${encodeURIComponent(typed)}`);
      if (!stale && r.data) setCheck(r.data);
    }, CHECK_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [typed, changed]);

  // Only an answer about what is in the box right now counts.
  const answer = changed && check?.slug === typed ? check : null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await send<SlugCheck>("/api/me/slug", "PATCH", { slug: typed });
    setSaving(false);
    if (r.ok && r.data) {
      await refreshPublicPages([current, r.data.slug]);
      setError(null);
      setValue(r.data.slug);
      onMoved(r.data.slug);
      toast({ title: "Address changed", description: `Your page is now at /${r.data.slug}.`, tone: "success" });
      router.refresh();
      return;
    }
    // 400 and 409 explain themselves (the same message as the live check); anything else is a server problem.
    const refusal = (r.status === 400 || r.status === 409) ? (r.body as SlugCheck | null)?.message : null;
    setError(refusal ?? "Your address was not changed. Try again in a moment.");
  }

  const status = !changed ? (
    <span className="text-graphite">This is your current address.</span>
  ) : answer === null ? (
    <span className="text-graphite">Checking…</span>
  ) : answer.available ? (
    <span className="text-success">Available</span>
  ) : (
    <span className="text-danger">{answer.message}</span>
  );

  return (
    <SettingsSection
      title="Address"
      description="Where people find your page. Changing it breaks links to the old address, and someone else can then take it."
    >
      <form onSubmit={save} noValidate className="flex max-w-md flex-col gap-3">
        <label htmlFor="slug" className="text-sm font-medium text-ink">Page address</label>
        <div
          className={cn(
            "flex h-10 items-center rounded-control border bg-sheet focus-within:ring-3 focus-within:ring-accent-soft",
            answer && !answer.available ? "border-danger" : "border-rule-strong focus-within:border-accent",
          )}
        >
          <span className="hidden shrink-0 pl-3 font-code text-sm text-graphite sm:inline">{origin.replace(/^https?:\/\//, "")}/</span>
          <span className="shrink-0 pl-3 font-code text-sm text-graphite sm:hidden">/</span>
          <input
            id="slug"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            maxLength={40}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={answer ? !answer.available : undefined}
            aria-describedby="slug-status"
            className="h-full min-w-0 flex-1 bg-transparent pr-3 font-code text-sm text-ink outline-none"
          />
        </div>
        <p id="slug-status" aria-live="polite" className="text-sm">{error ? <span className="text-danger">{error}</span> : status}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!answer?.available} loading={saving}>Change address</Button>
          {published && (
            <Link href={`/${current}`} className={buttonClasses("ghost", "md")} target="_blank">View public page</Link>
          )}
        </div>
      </form>
    </SettingsSection>
  );
}

/** Publish and the privacy switches. Each applies at once. */
export function Visibility({ page, onChange }: { page: PublicPage; onChange: (page: PublicPage) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function update(change: Partial<Pick<PublicPage, "isPublished" | "showEmail" | "showLocation" | "showPhone" | "allowCvDownload">>, done: string) {
    setBusy(true);
    const r = await send<PublicPage>("/api/me/public-page", "PATCH", change);
    setBusy(false);
    if (r.data) {
      await refreshPublicPages([r.data.slug]);
      onChange(r.data);
      toast({ title: done, tone: "success" });
    } else {
      toast({ title: "That change was not saved", description: "Try again in a moment.", tone: "danger" });
    }
  }

  return (
    <SettingsSection title="Visibility" description="Nothing is public until you publish. Email, location and phone stay hidden unless you show them.">
      <div className="flex max-w-md flex-col gap-5">
        <Switch
          label="Published"
          description={page.isPublished ? `Anyone with the address can see /${page.slug}.` : "Only you can see your page."}
          checked={page.isPublished}
          disabled={busy}
          onCheckedChange={(v) => update({ isPublished: v }, v ? "Page published" : "Page unpublished")}
        />
        <Switch
          label="Show email"
          description={<>The email from your <Link href="/dashboard/profile" className="underline underline-offset-2 hover:text-ink">profile</Link>, not your sign-in email.</>}
          checked={page.showEmail}
          disabled={busy}
          onCheckedChange={(v) => update({ showEmail: v }, v ? "Email shown on your page" : "Email hidden from your page")}
        />
        <Switch
          label="Show location"
          description="The location and country from your profile."
          checked={page.showLocation}
          disabled={busy}
          onCheckedChange={(v) => update({ showLocation: v }, v ? "Location shown on your page" : "Location hidden from your page")}
        />
        <Switch
          label="Show phone"
          description="The phone number from your profile."
          checked={page.showPhone}
          disabled={busy}
          onCheckedChange={(v) => update({ showPhone: v }, v ? "Phone shown on your page" : "Phone hidden from your page")}
        />
        <Switch
          label="CV download"
          description="A Download CV button on your page. The CV follows the email, location and phone switches above."
          checked={page.allowCvDownload}
          disabled={busy}
          onCheckedChange={(v) => update({ allowCvDownload: v }, v ? "CV download turned on" : "CV download turned off")}
        />
      </div>
    </SettingsSection>
  );
}
