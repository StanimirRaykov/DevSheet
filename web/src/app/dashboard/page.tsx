"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardProject, ProjectStatus, PUBLIC_API, topLanguages } from "@/lib/api";
import Link from "next/link";
import { SkillRow } from "./skill-row";

interface Me { githubLogin: string; slug: string; isPublished: boolean; lastSyncedAt: string | null }

const call = (path: string, init?: RequestInit) =>
  fetch(`${PUBLIC_API}${path}`, { credentials: "include", ...init });

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await call("/api/me");
    if (r.status === 401) return setState("anon");
    setMe(await r.json());
    setProjects(await (await call("/api/me/projects")).json());
    setState("ready");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function sync() {
    setBusy(true);
    await call("/api/me/sync", { method: "POST" });
    await load();
    setBusy(false);
  }
  async function setStatus(id: string, status: ProjectStatus) {
    await call(`/api/me/projects/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    await load();
  }
  async function setSkillStatus(projectId: string, skillId: string, status: 1 | 2) {
    await call(`/api/me/projects/${projectId}/skills/${skillId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    await load();
  }
  async function addSkill(projectId: string, name: string) {
    await call(`/api/me/projects/${projectId}/skills`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    await load();
  }
  async function publish(value: boolean) {
    await call(`/api/me/publish?value=${value}`, { method: "POST" });
    await load();
  }

  if (state === "loading") return <main className="p-8">Loading…</main>;
  if (state === "anon")
    return <main className="p-8"><a className="underline" href={`${PUBLIC_API}/auth/github`}>Sign in with GitHub</a></main>;

  const label = ["Pending approval", "Visible", "Hidden"];
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi, {me!.githubLogin}</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/profile" className="rounded border px-4 py-2">Profile &amp; CV data</Link>
          <button onClick={sync} disabled={busy} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
            {busy ? "Syncing…" : "Sync now"}
          </button>
          <button onClick={() => publish(!me!.isPublished)} className="rounded border px-4 py-2">
            {me!.isPublished ? "Unpublish" : "Publish page"}
          </button>
        </div>
      </header>
      {me!.isPublished && (
        <p className="text-sm text-neutral-600">Public page: <a className="underline" href={`/${me!.slug}`}>/{me!.slug}</a></p>
      )}
      <ul className="space-y-3">
        {projects.map((p) => (
          <li key={p.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <a href={p.url} className="font-semibold underline">{p.title}</a>
                <p className="text-sm text-neutral-600">{p.description ?? "No description"}</p>
                <p className="mt-1 text-xs text-neutral-500">{topLanguages(p.languagesJson).join(" · ")} · ★ {p.stars}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs font-medium">{label[p.status]}</span>
                <div className="flex gap-1">
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => setStatus(p.id, 1)}>Show</button>
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => setStatus(p.id, 2)}>Hide</button>
                </div>
              </div>
            </div>
            <SkillRow
              skills={p.skills}
              onSetStatus={(skillId, status) => setSkillStatus(p.id, skillId, status)}
              onAdd={(name) => addSkill(p.id, name)}
            />
          </li>
        ))}
        {projects.length === 0 && <li className="text-neutral-500">No projects yet — click “Sync now”.</li>}
      </ul>
    </main>
  );
}
