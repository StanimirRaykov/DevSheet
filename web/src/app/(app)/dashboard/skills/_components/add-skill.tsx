"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button, Field, Input, cn } from "@/components/ui";
import type { ProjectStatus } from "@/lib/api";
import { send } from "@/lib/client";

export interface ProjectChoice {
  id: string;
  title: string;
  status: ProjectStatus;
}

const STATUS_NOTE: Record<ProjectStatus, string | null> = { 0: "pending", 1: null, 2: "hidden" };

/**
 * Add a skill the detector missed. The name box suggests known skills as you type ("reactjs" finds React); any
 * other name is added as your own skill. It is confirmed at once on the projects you tick.
 */
export function AddSkill({ projects, onAdd }: { projects: ProjectChoice[]; onAdd: (name: string, projectIds: string[]) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const listId = useId();
  const latest = useRef("");

  async function search(value: string) {
    setName(value);
    setError(null);
    latest.current = value;
    if (!value.trim()) return setOptions([]);
    const r = await send<{ name: string }[]>(`/api/me/skills?query=${encodeURIComponent(value.trim())}`);
    // Answers can arrive out of order; keep only the one for what is in the box now.
    if (r.data && latest.current === value) setOptions(r.data.map((o) => o.name));
  }

  function toggle(id: string) {
    setPicked((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError("Enter the name of a skill.");
    if (picked.size === 0) return setError("Tick at least one project that uses it.");
    setSaving(true);
    const ok = await onAdd(clean, [...picked]);
    setSaving(false);
    if (ok) {
      setName("");
      setOptions([]);
      setPicked(new Set());
    }
  }

  if (projects.length === 0) {
    return <p className="text-sm text-graphite">Skills belong to projects. Import your repositories on the Projects page first.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-4">
      <div className="max-w-md">
        <Field label="Skill" hint="For example Docker, React or Kubernetes." error={error ?? undefined}>
          <Input list={listId} value={name} maxLength={60} autoComplete="off" onChange={(e) => search(e.target.value)} />
        </Field>
      </div>
      <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">Used in</legend>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-sm hover:bg-paper", picked.has(p.id) && "bg-accent-soft/40")}>
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="size-4 shrink-0 accent-accent" />
                <span className="min-w-0 font-code break-words text-ink">{p.title}</span>
                {STATUS_NOTE[p.status] && <span className="text-xs text-graphite">{STATUS_NOTE[p.status]}</span>}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Button type="submit" loading={saving} className="self-start">
        {picked.size > 1 ? `Add to ${picked.size} projects` : "Add skill"}
      </Button>
    </form>
  );
}
