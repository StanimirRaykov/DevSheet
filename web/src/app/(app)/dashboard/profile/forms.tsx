"use client";

import { useState } from "react";
import { EducationItem, ExperienceItem, ProfileData } from "@/lib/api";
import { FieldErrors, send } from "@/lib/client";
import { formatRange } from "@/lib/dates";

export const input = "w-full rounded border px-2 py-1 text-sm";

export function Field({ label, errors, children }: { label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {errors?.map((e) => <span key={e} className="block text-xs text-red-700">{e}</span>)}
    </label>
  );
}

// ---------------- profile ----------------
export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [p, setP] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) => { setP({ ...p, [k]: v }); setSaved(false); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await send<ProfileData>("/api/me/profile", "PUT", p);
    setErrors(r.errors);
    setSaved(r.ok);
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Full name" errors={errors.fullName}><input className={input} value={p.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
      <Field label="Headline" errors={errors.headline}><input className={input} value={p.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
      <Field label="Summary" errors={errors.summary}><textarea rows={4} className={input} value={p.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
      <Field label="Location" errors={errors.location}><input className={input} value={p.location} onChange={(e) => set("location", e.target.value)} /></Field>
      <Field label="Email" errors={errors.email}><input type="email" className={input} value={p.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.showLocationPublicly} onChange={(e) => set("showLocationPublicly", e.target.checked)} />
        Show location on my public page
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.showEmailPublicly} onChange={(e) => set("showEmailPublicly", e.target.checked)} />
        Show email on my public page
      </label>
      <div className="flex items-center gap-3">
        <button className="rounded bg-black px-4 py-2 text-sm text-white">Save profile</button>
        {saved && <span className="text-sm text-emerald-700">Saved</span>}
      </div>
    </form>
  );
}

// ---------------- experience ----------------
const emptyExp = { company: "", title: "", startDate: "", endDate: "", description: "" };

export function ExperienceSection({ items, onChange }: { items: ExperienceItem[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState(emptyExp);
  const [current, setCurrent] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  function edit(x: ExperienceItem) {
    setEditing(x.id);
    setCurrent(x.endDate === null);
    setForm({ company: x.company, title: x.title, startDate: x.startDate, endDate: x.endDate ?? "", description: x.description });
    setErrors({});
  }
  function reset() { setEditing(null); setCurrent(false); setForm(emptyExp); setErrors({}); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, startDate: form.startDate || null, endDate: current || !form.endDate ? null : form.endDate };
    const r = editing ? await send(`/api/me/experience/${editing}`, "PUT", body) : await send("/api/me/experience", "POST", body);
    setErrors(r.errors);
    if (r.ok) { reset(); await onChange(); }
  }
  async function remove(id: string) {
    await send(`/api/me/experience/${id}`, "DELETE");
    if (editing === id) reset();
    await onChange();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.id} className="flex items-start justify-between gap-3 rounded border p-3 text-sm">
            <div>
              <p className="font-semibold">{x.title} · {x.company}</p>
              <p className="text-xs text-neutral-500">{formatRange(x.startDate, x.endDate)}</p>
              {x.description && <p className="mt-1 whitespace-pre-line text-neutral-700">{x.description}</p>}
            </div>
            <div className="flex gap-1">
              <button className="rounded border px-2 py-1 text-xs" onClick={() => edit(x)}>Edit</button>
              <button className="rounded border px-2 py-1 text-xs text-red-700" onClick={() => remove(x.id)}>Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-neutral-500">No experience yet.</li>}
      </ul>
      <form onSubmit={save} className="space-y-3 rounded border border-dashed p-3">
        <p className="text-sm font-medium">{editing ? "Edit experience" : "Add experience"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company" errors={errors.company}><input className={input} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Title" errors={errors.title}><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Start date" errors={errors.startDate}><input type="date" className={input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End date" errors={errors.endDate}><input type="date" disabled={current} className={input} value={current ? "" : form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> I currently work here</label>
        <Field label="Description" errors={errors.description}><textarea rows={3} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-sm text-white">{editing ? "Save changes" : "Add"}</button>
          {editing && <button type="button" className="rounded border px-4 py-2 text-sm" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

// ---------------- education ----------------
const emptyEdu = { institution: "", degree: "", startDate: "", endDate: "" };

export function EducationSection({ items, onChange }: { items: EducationItem[]; onChange: () => Promise<void> }) {
  const [form, setForm] = useState(emptyEdu);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  function edit(x: EducationItem) {
    setEditing(x.id);
    setForm({ institution: x.institution, degree: x.degree, startDate: x.startDate ?? "", endDate: x.endDate ?? "" });
    setErrors({});
  }
  function reset() { setEditing(null); setForm(emptyEdu); setErrors({}); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
    const r = editing ? await send(`/api/me/education/${editing}`, "PUT", body) : await send("/api/me/education", "POST", body);
    setErrors(r.errors);
    if (r.ok) { reset(); await onChange(); }
  }
  async function remove(id: string) {
    await send(`/api/me/education/${id}`, "DELETE");
    if (editing === id) reset();
    await onChange();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.id} className="flex items-start justify-between gap-3 rounded border p-3 text-sm">
            <div>
              <p className="font-semibold">{x.institution}{x.degree && ` · ${x.degree}`}</p>
              <p className="text-xs text-neutral-500">{formatRange(x.startDate, x.endDate)}</p>
            </div>
            <div className="flex gap-1">
              <button className="rounded border px-2 py-1 text-xs" onClick={() => edit(x)}>Edit</button>
              <button className="rounded border px-2 py-1 text-xs text-red-700" onClick={() => remove(x.id)}>Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-neutral-500">No education yet.</li>}
      </ul>
      <form onSubmit={save} className="space-y-3 rounded border border-dashed p-3">
        <p className="text-sm font-medium">{editing ? "Edit education" : "Add education"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Institution" errors={errors.institution}><input className={input} value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
          <Field label="Degree" errors={errors.degree}><input className={input} value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></Field>
          <Field label="Start date" errors={errors.startDate}><input type="date" className={input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End date (empty = ongoing)" errors={errors.endDate}><input type="date" className={input} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-sm text-white">{editing ? "Save changes" : "Add"}</button>
          {editing && <button type="button" className="rounded border px-4 py-2 text-sm" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
