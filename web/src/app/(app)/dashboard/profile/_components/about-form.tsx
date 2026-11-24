"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import type { Country, ProfileData } from "@/lib/api";
import { LONG_MAX, checkAbout, type Errors } from "@/lib/career";
import { send } from "@/lib/client";
import { mapFieldErrors } from "@/lib/field-errors";
import { focusFirstError } from "./item-dialog";
import { Checkbox, counter } from "./sections";

const FIELDS = ["fullName", "headline", "summary", "location", "countryCode", "email", "phone", "website"] as const;

export const sameProfile = (a: ProfileData, b: ProfileData) =>
  (Object.keys(a) as (keyof ProfileData)[]).every((k) => a[k] === b[k]);

/**
 * Name, headline, summary and contact details. The draft lives in the parent, so switching to another tab and
 * back keeps what was typed.
 */
export function AboutForm({
  saved,
  draft,
  onDraft,
  onSaved,
}: {
  saved: ProfileData;
  draft: ProfileData;
  onDraft: (draft: ProfileData) => void;
  onSaved: (profile: ProfileData) => void;
}) {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = !sameProfile(saved, draft);
  const countries = useCountries();
  const dialing = Array.isArray(countries) ? countries.find((c) => c.code === draft.countryCode)?.dialing : undefined;

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    onDraft({ ...draft, [key]: value });
    if (errors[key]) setErrors(({ [key]: _gone, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const found = checkAbout(draft);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return focusFirstError(form.current);
    }
    setSaving(true);
    try {
      const r = await send<ProfileData>("/api/me/profile", "PUT", draft);
      if (r.ok && r.data) {
        setErrors({});
        onSaved(r.data);
        toast({ tone: "success", title: "Profile saved" });
      } else if (r.status === 400) {
        const mapped = mapFieldErrors(r.body, FIELDS);
        setErrors(mapped.fields);
        setFormError(mapped.form);
        focusFirstError(form.current);
      } else {
        setFormError("Not saved: the server did not answer as expected. Try again in a moment.");
      }
    } catch {
      setFormError("Not saved: DevSheet could not be reached. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={form} onSubmit={save} noValidate className="flex max-w-2xl flex-col">
      {formError && <p role="alert" className="mb-4 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{formError}</p>}

      <Group title="Who you are" description="The top of your CV and your public page.">
        <Field label="Full name" hint="Leave empty to use your display name." error={errors.fullName}>
          <Input value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Headline" hint="One line, for example Backend developer, .NET and PostgreSQL." error={errors.headline}>
          <Input value={draft.headline} onChange={(e) => set("headline", e.target.value)} />
        </Field>
        <Field label="Summary" hint={<>A few sentences about what you build and how. {counter(draft.summary, LONG_MAX)}.</>} error={errors.summary}>
          <Textarea rows={6} value={draft.summary} onChange={(e) => set("summary", e.target.value)} />
        </Field>
      </Group>

      <Group title="Contact" description="On your CV. On your public page only where you allow it.">
        <div className="flex flex-col gap-2.5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" hint="Where you live or work from." error={errors.location}>
              <Input value={draft.location} onChange={(e) => set("location", e.target.value)} autoComplete="address-level2" />
            </Field>
            <Field
              label="Country"
              hint={countries === "error" ? "The list of countries could not be loaded. Reload to try again." : "Shown after the city. The Europass export needs it to include your city."}
              error={errors.countryCode}
            >
              <Select
                value={draft.countryCode}
                onChange={(e) => set("countryCode", e.target.value)}
                disabled={countries === null || countries === "error"}
                autoComplete="country"
              >
                <option value="">No country</option>
                {Array.isArray(countries)
                  ? countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)
                  : draft.countryCode && <option value={draft.countryCode}>{draft.countryCode.toUpperCase()}</option>}
              </Select>
            </Field>
          </div>
          <Checkbox checked={draft.showLocationPublicly} onChange={(v) => set("showLocationPublicly", v)}>Show my city and country on my public page</Checkbox>
        </div>
        <div className="flex flex-col gap-2.5">
          <Field label="Email" hint="Not your sign-in email. Readers of your CV write here." error={errors.email}>
            <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          </Field>
          <Checkbox checked={draft.showEmailPublicly} onChange={(v) => set("showEmailPublicly", v)}>Show my email on my public page</Checkbox>
        </div>
        <div className="flex flex-col gap-2.5">
          <Field
            label="Phone"
            hint={`Optional. Start with + and the country code, for example ${dialing ? `+${dialing}` : "+359"} 88 123 4567.`}
            error={errors.phone}
          >
            <Input type="tel" inputMode="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
          </Field>
          <Checkbox checked={draft.showPhonePublicly} onChange={(v) => set("showPhonePublicly", v)}>Show my phone on my public page</Checkbox>
        </div>
        <Field label="Website" hint="Optional, a full https:// address. Shown on your public page." error={errors.website}>
          <Input type="url" inputMode="url" placeholder="https://" value={draft.website} onChange={(e) => set("website", e.target.value)} autoComplete="url" />
        </Field>
      </Group>

      <div className="flex items-center gap-3 pt-6">
        <Button type="submit" loading={saving} disabled={!dirty}>Save profile</Button>
        {dirty && !saving && (
          <Button variant="ghost" onClick={() => { onDraft(saved); setErrors({}); setFormError(null); }}>Discard changes</Button>
        )}
      </div>
    </form>
  );
}

/** The country list, loaded once per form. null while loading. */
function useCountries(): Country[] | null | "error" {
  const [countries, setCountries] = useState<Country[] | null | "error">(null);
  useEffect(() => {
    let live = true;
    send<Country[]>("/api/countries")
      .then((r) => { if (live) setCountries(r.ok && r.data ? r.data : "error"); })
      .catch(() => { if (live) setCountries("error"); });
    return () => { live = false; };
  }, []);
  return countries;
}

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-rule py-6 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-serif text-lg text-ink">{title}</h2>
        <p className="text-sm text-graphite">{description}</p>
      </div>
      {children}
    </section>
  );
}
