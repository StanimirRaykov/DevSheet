"use client";

import { useState } from "react";
import { CertificationItem, LanguageItem } from "@/lib/api";
import { LEVELS, LevelSet, SKILLS, SkillKey, setAll, summarizeLevels, uniformLevel } from "@/lib/cefr";
import { FieldErrors, send } from "@/lib/client";
import { formatMonth } from "@/lib/dates";
import { Field, input } from "./forms";

// ---------------- languages ----------------
const emptyLang = { name: "", isoCode: "", isMotherTongue: false };

function LevelSelect({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  return (
    <select aria-label={label} className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">—</option>
      {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
    </select>
  );
}

export function LanguagesSection({ items, onChange }: { items: LanguageItem[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState(emptyLang);
  const [levels, setLevels] = useState<LevelSet>(setAll(null));
  const [custom, setCustom] = useState(false); // show the five separate selects
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  function edit(x: LanguageItem) {
    const l: LevelSet = {
      listening: x.listening, reading: x.reading, spokenInteraction: x.spokenInteraction,
      spokenProduction: x.spokenProduction, writing: x.writing,
    };
    setEditing(x.id);
    setForm({ name: x.name, isoCode: x.isoCode ?? "", isMotherTongue: x.isMotherTongue });
    setLevels(l);
    setCustom(!x.isMotherTongue && summarizeLevels(l) !== "" && uniformLevel(l) === null);
    setErrors({});
  }
  function reset() { setEditing(null); setForm(emptyLang); setLevels(setAll(null)); setCustom(false); setErrors({}); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // A native language carries no levels (the API rejects them).
    const body = { ...form, ...(form.isMotherTongue ? setAll(null) : levels) };
    const r = editing ? await send(`/api/me/languages/${editing}`, "PUT", body) : await send("/api/me/languages", "POST", body);
    setErrors(r.errors);
    if (r.ok) { reset(); await onChange(); }
  }
  async function remove(id: string) {
    await send(`/api/me/languages/${id}`, "DELETE");
    if (editing === id) reset();
    await onChange();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.id} className="flex items-start justify-between gap-3 rounded border p-3 text-sm">
            <div>
              <p className="font-semibold">{x.name}{x.isoCode && <span className="ml-1 text-xs font-normal text-neutral-500">({x.isoCode})</span>}</p>
              <p className="text-xs text-neutral-600">
                {x.isMotherTongue ? "Native language" : summarizeLevels(x) || "No level given"}
              </p>
            </div>
            <div className="flex gap-1">
              <button className="rounded border px-2 py-1 text-xs" onClick={() => edit(x)}>Edit</button>
              <button className="rounded border px-2 py-1 text-xs text-red-700" onClick={() => remove(x.id)}>Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-neutral-500">No languages yet.</li>}
      </ul>

      <form onSubmit={save} className="space-y-3 rounded border border-dashed p-3">
        <p className="text-sm font-medium">{editing ? "Edit language" : "Add language"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Language" errors={errors.name}><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="ISO code (optional, e.g. bg)" errors={errors.isoCode}>
            <input className={input} maxLength={2} value={form.isoCode} onChange={(e) => setForm({ ...form, isoCode: e.target.value.toLowerCase() })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isMotherTongue} onChange={(e) => setForm({ ...form, isMotherTongue: e.target.checked })} />
          Native language
        </label>

        {!form.isMotherTongue && (
          <div className="space-y-2">
            <div className="max-w-xs">
              <Field label="Overall level (fills all five skills)">
                <LevelSelect label="Overall level" value={uniformLevel(levels)} onChange={(v) => setLevels(setAll(v))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
              Set each skill separately
            </label>
            {custom && (
              <div className="grid gap-3 sm:grid-cols-5">
                {SKILLS.map((s) => (
                  <Field key={s.key} label={s.label}>
                    <LevelSelect label={s.label} value={levels[s.key]} onChange={(v) => setLevels({ ...levels, [s.key as SkillKey]: v })} />
                  </Field>
                ))}
              </div>
            )}
            {errors.levels?.map((m) => <p key={m} className="text-xs text-red-700">{m}</p>)}
          </div>
        )}
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-sm text-white">{editing ? "Save changes" : "Add"}</button>
          {editing && <button type="button" className="rounded border px-4 py-2 text-sm" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

// ---------------- certifications ----------------
const emptyCert = { name: "", issuer: "", issueDate: "", url: "" };

export function CertificationsSection({ items, onChange }: { items: CertificationItem[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState(emptyCert);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  function edit(x: CertificationItem) {
    setEditing(x.id);
    setForm({ name: x.name, issuer: x.issuer, issueDate: x.issueDate ?? "", url: x.url ?? "" });
    setErrors({});
  }
  function reset() { setEditing(null); setForm(emptyCert); setErrors({}); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, issueDate: form.issueDate || null, url: form.url || null };
    const r = editing ? await send(`/api/me/certifications/${editing}`, "PUT", body) : await send("/api/me/certifications", "POST", body);
    setErrors(r.errors);
    if (r.ok) { reset(); await onChange(); }
  }
  async function remove(id: string) {
    await send(`/api/me/certifications/${id}`, "DELETE");
    if (editing === id) reset();
    await onChange();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.id} className="flex items-start justify-between gap-3 rounded border p-3 text-sm">
            <div>
              <p className="font-semibold">{x.name}</p>
              <p className="text-xs text-neutral-500">
                {[x.issuer, x.issueDate ? formatMonth(x.issueDate) : ""].filter(Boolean).join(" · ")}
              </p>
              {x.url && <a href={x.url} className="text-xs text-emerald-700 underline" rel="noopener noreferrer" target="_blank">{x.url}</a>}
            </div>
            <div className="flex gap-1">
              <button className="rounded border px-2 py-1 text-xs" onClick={() => edit(x)}>Edit</button>
              <button className="rounded border px-2 py-1 text-xs text-red-700" onClick={() => remove(x.id)}>Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-neutral-500">No certifications yet.</li>}
      </ul>

      <form onSubmit={save} className="space-y-3 rounded border border-dashed p-3">
        <p className="text-sm font-medium">{editing ? "Edit certification" : "Add certification"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" errors={errors.name}><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Issuer" errors={errors.issuer}><input className={input} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></Field>
          <Field label="Issue date" errors={errors.issueDate}><input type="date" className={input} value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></Field>
          <Field label="Link (optional)" errors={errors.url}><input className={input} placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-sm text-white">{editing ? "Save changes" : "Add"}</button>
          {editing && <button type="button" className="rounded border px-4 py-2 text-sm" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
