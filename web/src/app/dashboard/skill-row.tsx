"use client";

import { useId, useState } from "react";
import { DashboardSkill, PUBLIC_API } from "@/lib/api";
import { splitSkills } from "@/lib/skills";

interface Props {
  skills: DashboardSkill[];
  onSetStatus: (skillId: string, status: 1 | 2) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
}

export function SkillRow({ skills, onSetStatus, onAdd }: Props) {
  const { confirmed, suggested } = splitSkills(skills);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const listId = useId();

  async function search(value: string) {
    setText(value);
    if (!value.trim()) return setOptions([]);
    const r = await fetch(`${PUBLIC_API}/api/me/skills?query=${encodeURIComponent(value)}`, { credentials: "include" });
    if (r.ok) setOptions(((await r.json()) as { name: string }[]).map((o) => o.name));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await onAdd(text.trim());
    setText("");
    setOptions([]);
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {confirmed.map((s) => (
          <span key={s.skillId} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-900">
            {s.name}
            <button aria-label={`Remove ${s.name}`} title="Remove" className="font-bold" onClick={() => onSetStatus(s.skillId, 2)}>×</button>
          </span>
        ))}
        {suggested.map((s) => (
          <span key={s.skillId} className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-400 px-2.5 py-0.5 text-xs text-neutral-700">
            {s.name}?
            <button aria-label={`Confirm ${s.name}`} title="Confirm" className="font-bold text-emerald-700" onClick={() => onSetStatus(s.skillId, 1)}>✓</button>
            <button aria-label={`Reject ${s.name}`} title="Reject" className="font-bold text-red-700" onClick={() => onSetStatus(s.skillId, 2)}>✗</button>
          </span>
        ))}
        {confirmed.length === 0 && suggested.length === 0 && <span className="text-xs text-neutral-500">No skills yet</span>}
      </div>
      <form onSubmit={submit} className="flex gap-1">
        <input
          list={listId}
          value={text}
          maxLength={60}
          onChange={(e) => search(e.target.value)}
          placeholder="Add skill…"
          className="w-44 rounded border px-2 py-1 text-xs"
        />
        <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
        <button type="submit" className="rounded border px-2 py-1 text-xs">Add</button>
      </form>
    </div>
  );
}
