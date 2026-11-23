"use client";

import type { ReactNode } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { CertificationItem, EducationItem, ExperienceItem, LanguageItem } from "@/lib/api";
import {
  LONG_MAX, checkCertification, checkEducation, checkExperience, checkLanguage, fromMonth, newestFirst, toMonth,
  type CertificationForm, type EducationForm, type ExperienceForm,
} from "@/lib/career";
import { LEVELS, LEVEL_INFO, SKILLS, levelLabel, setAll, summarizeLevels, uniformLevel, type LevelSet, type SkillKey } from "@/lib/cefr";
import { formatMonth, formatRange } from "@/lib/dates";
import type { FieldsProps, SectionConfig } from "./career-section";
import { MonthField } from "./month-field";

// ---------------- shared bits ----------------

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 shrink-0 accent-accent" />
      {children}
    </label>
  );
}

/** "312 of 2000 characters", red past the limit. */
export function counter(text: string, max: number): ReactNode {
  const n = text.trim().length;
  return <span className={n > max ? "text-danger" : undefined}>{n} of {max} characters</span>;
}

function Title({ children }: { children: ReactNode }) {
  return <p className="font-medium text-ink">{children}</p>;
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="text-sm text-graphite">{children}</p>;
}

// ---------------- experience ----------------

function ExperienceFields({ form, set, errors }: FieldsProps<ExperienceForm>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" error={errors.title}>
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={210} autoFocus />
        </Field>
        <Field label="Company" error={errors.company}>
          <Input value={form.company} onChange={(e) => set({ company: e.target.value })} maxLength={210} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MonthField label="Start" value={form.startDate} onChange={(v) => set({ startDate: v })} error={errors.startDate} />
        <MonthField label="End" value={form.endDate} onChange={(v) => set({ endDate: v })} error={errors.endDate} disabled={form.current} hint={form.current ? "Shown as Present." : undefined} />
      </div>
      <Checkbox checked={form.current} onChange={(current) => set({ current })}>I currently work here</Checkbox>
      <Field label="What you did" hint={counter(form.description, LONG_MAX)} error={errors.description}>
        <Textarea rows={5} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
    </>
  );
}

export const experienceConfig: SectionConfig<ExperienceItem, ExperienceForm> = {
  endpoint: "/api/me/experience",
  noun: "experience",
  intro: "Your jobs, newest first. They appear on your CV and your public page.",
  emptyTitle: "No work experience yet",
  emptyText: "Add the jobs you want on your CV, including the one you have now.",
  fields: ["title", "company", "startDate", "endDate", "description"],
  empty: { title: "", company: "", startDate: "", endDate: "", current: false, description: "" },
  fromItem: (x) => ({ title: x.title, company: x.company, startDate: toMonth(x.startDate), endDate: toMonth(x.endDate), current: x.endDate === null, description: x.description }),
  toBody: (f) => ({
    title: f.title.trim(), company: f.company.trim(), description: f.description.trim(),
    startDate: fromMonth(f.startDate), endDate: f.current ? null : fromMonth(f.endDate),
  }),
  check: checkExperience,
  name: (x) => `${x.title} at ${x.company}`,
  sort: (items) => newestFirst(items, (x) => x.startDate, (x) => x.endDate),
  layout: "timeline",
  isCurrent: (x) => x.endDate === null,
  Fields: ExperienceFields,
  Summary: ({ item }) => (
    <div className="flex flex-col gap-1">
      <Title>{item.title}</Title>
      <Meta>{item.company}, {formatRange(item.startDate, item.endDate)}</Meta>
      {item.description && <p className="mt-1 line-clamp-2 text-sm whitespace-pre-line text-ink/80">{item.description}</p>}
    </div>
  ),
};

// ---------------- education ----------------

function EducationFields({ form, set, errors }: FieldsProps<EducationForm>) {
  return (
    <>
      <Field label="School or university" error={errors.institution}>
        <Input value={form.institution} onChange={(e) => set({ institution: e.target.value })} maxLength={210} autoFocus />
      </Field>
      <Field label="Degree or course" hint="Optional, for example BSc Computer Science." error={errors.degree}>
        <Input value={form.degree} onChange={(e) => set({ degree: e.target.value })} maxLength={210} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <MonthField label="Start" value={form.startDate} onChange={(v) => set({ startDate: v })} error={errors.startDate} hint="Optional." />
        <MonthField label="End" value={form.endDate} onChange={(v) => set({ endDate: v })} error={errors.endDate} yearsAhead={6} hint="Leave empty while you study there." />
      </div>
    </>
  );
}

export const educationConfig: SectionConfig<EducationItem, EducationForm> = {
  endpoint: "/api/me/education",
  noun: "education",
  intro: "Schools, universities and long courses, newest first.",
  emptyTitle: "No education yet",
  emptyText: "Add your degree or the courses that shaped how you work.",
  fields: ["institution", "degree", "startDate", "endDate"],
  empty: { institution: "", degree: "", startDate: "", endDate: "" },
  fromItem: (x) => ({ institution: x.institution, degree: x.degree, startDate: toMonth(x.startDate), endDate: toMonth(x.endDate) }),
  toBody: (f) => ({ institution: f.institution.trim(), degree: f.degree.trim(), startDate: fromMonth(f.startDate), endDate: fromMonth(f.endDate) }),
  check: checkEducation,
  name: (x) => x.institution,
  sort: (items) => newestFirst(items, (x) => x.startDate, (x) => x.endDate),
  layout: "timeline",
  isCurrent: (x) => !!x.startDate && x.endDate === null,
  Fields: EducationFields,
  Summary: ({ item }) => (
    <div className="flex flex-col gap-1">
      <Title>{item.institution}</Title>
      <Meta>{[item.degree, formatRange(item.startDate, item.endDate)].filter(Boolean).join(", ")}</Meta>
    </div>
  ),
};

// ---------------- languages ----------------

interface LanguageFormFull {
  name: string;
  isoCode: string;
  isMotherTongue: boolean;
  levels: LevelSet;
  /** Show the five skills separately instead of one overall level. */
  separate: boolean;
}

const levelOption = (value: number) => `${levelLabel(value)}, ${LEVEL_INFO[value].name.toLowerCase()}`;

function LevelSelect({ label, value, onChange, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string }) {
  return (
    <Field label={label} hint={value ? LEVEL_INFO[value].description : hint}>
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">Not set</option>
        {LEVELS.map((l) => <option key={l.value} value={l.value}>{levelOption(l.value)}</option>)}
      </Select>
    </Field>
  );
}

function LanguageFields({ form, set, errors }: FieldsProps<LanguageFormFull>) {
  const overall = uniformLevel(form.levels);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Language" error={errors.name}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={210} autoFocus />
        </Field>
        <Field label="Code" hint="Optional, like bg or en." error={errors.isoCode}>
          <Input value={form.isoCode} onChange={(e) => set({ isoCode: e.target.value.toLowerCase() })} maxLength={2} autoComplete="off" />
        </Field>
      </div>
      <Checkbox checked={form.isMotherTongue} onChange={(isMotherTongue) => set({ isMotherTongue })}>This is my mother tongue</Checkbox>
      {!form.isMotherTongue && (
        <fieldset className="flex flex-col gap-4 rounded-panel border border-rule px-4 pt-2 pb-4">
          <legend className="px-1 text-sm font-medium text-ink">Level (CEFR)</legend>
          {!form.separate && (
            <LevelSelect
              label="Overall level"
              value={overall}
              onChange={(v) => set({ levels: setAll(v) })}
              hint={summarizeLevels(form.levels) ? "Your skills have different levels; set them separately below." : "A1 is a beginner, C2 is close to a native speaker."}
            />
          )}
          <Checkbox checked={form.separate} onChange={(separate) => set({ separate })}>Set each skill separately</Checkbox>
          {form.separate && SKILLS.map((s) => (
            <LevelSelect key={s.key} label={s.label} value={form.levels[s.key]} onChange={(v) => set({ levels: { ...form.levels, [s.key as SkillKey]: v } })} />
          ))}
          {errors.levels && <p className="text-sm text-danger">{errors.levels}</p>}
        </fieldset>
      )}
    </>
  );
}

function languageLevel(x: LanguageItem): string {
  if (x.isMotherTongue) return "Mother tongue";
  const overall = uniformLevel(x);
  if (overall !== null) return levelOption(overall);
  return summarizeLevels(x) || "No level given";
}

export const languageConfig: SectionConfig<LanguageItem, LanguageFormFull> = {
  endpoint: "/api/me/languages",
  noun: "language",
  intro: "The languages you speak, with levels on the European CEFR scale, as Europass CVs show them.",
  emptyTitle: "No languages yet",
  emptyText: "Add your mother tongue and the languages you work in.",
  fields: ["name", "isoCode", "levels"],
  empty: { name: "", isoCode: "", isMotherTongue: false, levels: setAll(null), separate: false },
  fromItem: (x) => {
    const levels: LevelSet = { listening: x.listening, reading: x.reading, spokenInteraction: x.spokenInteraction, spokenProduction: x.spokenProduction, writing: x.writing };
    return { name: x.name, isoCode: x.isoCode ?? "", isMotherTongue: x.isMotherTongue, levels, separate: summarizeLevels(levels) !== "" && uniformLevel(levels) === null };
  },
  // A mother tongue carries no levels (the API refuses them).
  toBody: (f) => ({ name: f.name.trim(), isoCode: f.isoCode.trim() || null, isMotherTongue: f.isMotherTongue, ...(f.isMotherTongue ? setAll(null) : f.levels) }),
  check: (f) => checkLanguage(f),
  name: (x) => x.name,
  // Mother tongues first, then the highest level, then A to Z.
  sort: (items) => [...items].sort((a, b) =>
    Number(b.isMotherTongue) - Number(a.isMotherTongue) || top(b) - top(a) || a.name.localeCompare(b.name)),
  layout: "list",
  Fields: LanguageFields,
  Summary: ({ item }) => (
    <div className="flex flex-col gap-0.5">
      <Title>{item.name}</Title>
      <Meta>{languageLevel(item)}</Meta>
    </div>
  ),
};

function top(x: LanguageItem): number {
  return Math.max(0, ...SKILLS.map((s) => x[s.key] ?? 0));
}

// ---------------- certifications ----------------

function CertificationFields({ form, set, errors }: FieldsProps<CertificationForm>) {
  return (
    <>
      <Field label="Certificate" error={errors.name}>
        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={210} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issued by" hint="Optional." error={errors.issuer}>
          <Input value={form.issuer} onChange={(e) => set({ issuer: e.target.value })} maxLength={210} />
        </Field>
        <MonthField label="Issued" value={form.issueDate} onChange={(v) => set({ issueDate: v })} error={errors.issueDate} hint="Optional." />
      </div>
      <Field label="Link to verify it" hint="Optional, a full https:// address." error={errors.url}>
        <Input type="url" inputMode="url" placeholder="https://" value={form.url} onChange={(e) => set({ url: e.target.value })} />
      </Field>
    </>
  );
}

function host(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

export const certificationConfig: SectionConfig<CertificationItem, CertificationForm> = {
  endpoint: "/api/me/certifications",
  noun: "certification",
  intro: "Certificates and exams, newest first. A link lets readers check them.",
  emptyTitle: "No certifications yet",
  emptyText: "Add cloud, security or language certificates you hold.",
  fields: ["name", "issuer", "issueDate", "url"],
  empty: { name: "", issuer: "", issueDate: "", url: "" },
  fromItem: (x) => ({ name: x.name, issuer: x.issuer, issueDate: toMonth(x.issueDate), url: x.url ?? "" }),
  toBody: (f) => ({ name: f.name.trim(), issuer: f.issuer.trim(), issueDate: fromMonth(f.issueDate), url: f.url.trim() || null }),
  check: (f) => checkCertification(f),
  name: (x) => x.name,
  sort: (items) => [...items].sort((a, b) => (b.issueDate ?? "").localeCompare(a.issueDate ?? "") || a.name.localeCompare(b.name)),
  layout: "list",
  Fields: CertificationFields,
  Summary: ({ item }) => (
    <div className="flex flex-col gap-0.5">
      <Title>{item.name}</Title>
      {(item.issuer || item.issueDate) && <Meta>{[item.issuer, item.issueDate && formatMonth(item.issueDate)].filter(Boolean).join(", ")}</Meta>}
      {item.url && <p className="font-code text-xs break-all text-graphite">{host(item.url)}</p>}
    </div>
  ),
};
