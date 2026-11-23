"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMe } from "@/components/me-provider";
import { Button, EmptyState, Panel, Skeleton, useToast } from "@/components/ui";
import type { DashboardProject, LinkStatus, SkillLinkKey, SkillSummary } from "@/lib/api";
import { send } from "@/lib/client";
import {
  groupByStatus, linksOf, skillBoard, statusesOf, withLinkStatuses, type ConfirmedSkill, type RejectedSkill, type Suggestion,
} from "@/lib/skills";
import { refreshPublicPages } from "../../../settings/actions";
import { AddSkill, type ProjectChoice } from "./add-skill";
import { SuggestionQueue } from "./suggestion-queue";
import { YourSkills } from "./your-skills";

/**
 * One place for every skill: the suggestions found in the code (confirm or reject, with undo), the confirmed
 * skills as the public page groups them, the rejected ones, and adding a skill by hand.
 */
export function SkillsView() {
  const me = useMe();
  const toast = useToast();
  const [skills, setSkills] = useState<SkillSummary[] | null | "error">(null);
  const [projects, setProjects] = useState<ProjectChoice[]>([]);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([send<SkillSummary[]>("/api/me/skill-links"), send<DashboardProject[]>("/api/me/projects")]);
    setSkills((current) => s.data ?? (Array.isArray(current) ? current : "error"));
    if (p.data) {
      // Visible projects first (they are the ones on the page), then A to Z.
      setProjects(p.data
        .map((x) => ({ id: x.id, title: x.title, status: x.status }))
        .sort((a, b) => Number(b.status === 1) - Number(a.status === 1) || a.title.localeCompare(b.title)));
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (Array.isArray(skills) ? skills : []), [skills]);
  const board = useMemo(() => skillBoard(list), [list]);

  const save = (links: SkillLinkKey[], status: LinkStatus) => send("/api/me/skill-links", "PATCH", { links, status });
  const afterChange = () => { if (me.isPublished) refreshPublicPages([me.slug]); };

  /** Sets links to a status at once, then saves; on failure they go back. The toast offers Undo. */
  async function change(links: SkillLinkKey[], status: LinkStatus, title: string, failed: string) {
    const previous = statusesOf(list, links);
    if (previous.size === 0) return;
    setSkills((s) => (Array.isArray(s) ? withLinkStatuses(s, new Map([...previous.keys()].map((k) => [k, status]))) : s));

    const r = await save(links, status);
    if (!r.ok) {
      setSkills((s) => (Array.isArray(s) ? withLinkStatuses(s, previous) : s));
      const reason = r.body && typeof r.body === "object" && "error" in r.body ? String(r.body.error) : null;
      toast({ tone: "danger", title: failed, description: reason ?? "Nothing changed. Try again in a moment." });
      return;
    }
    afterChange();
    toast({ tone: "success", title, action: { label: "Undo", onClick: () => undo(previous, status) } });
  }

  /** Puts every link back to the status it had before; one request per old status. */
  async function undo(previous: Map<string, LinkStatus>, from: LinkStatus) {
    setSkills((s) => (Array.isArray(s) ? withLinkStatuses(s, previous) : s));
    const results = await Promise.all(groupByStatus(previous).map(([status, links]) => save(links, status)));
    if (results.some((r) => !r.ok)) {
      setSkills((s) => (Array.isArray(s) ? withLinkStatuses(s, new Map([...previous.keys()].map((k) => [k, from]))) : s));
      toast({ tone: "danger", title: "Not undone", description: "The change stays. Try again in a moment." });
      load();
      return;
    }
    afterChange();
  }

  const decide = (s: Suggestion, status: 1 | 2) =>
    change(linksOf(s), status, `${s.name} ${status === 1 ? "confirmed" : "rejected"}`, `${s.name} not ${status === 1 ? "confirmed" : "rejected"}`);
  const confirmProject = (title: string, links: SkillLinkKey[]) =>
    change(links, 1, `${links.length === 1 ? "1 skill" : `${links.length} skills`} from ${title} confirmed`, `Skills from ${title} not confirmed`);
  const remove = (s: ConfirmedSkill) => change(s.links, 2, `${s.name} removed`, `${s.name} not removed`);
  const restore = (s: RejectedSkill) =>
    change(s.projects.map((p) => ({ projectId: p.projectId, skillId: s.skillId })), 0, `${s.name} is back in suggestions`, `${s.name} not restored`);

  async function add(name: string, projectIds: string[]): Promise<boolean> {
    const results = await Promise.all(projectIds.map((id) => send(`/api/me/projects/${id}/skills`, "POST", { name })));
    await load();
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) {
      const reason = results.find((r) => !r.ok)?.body;
      const message = reason && typeof reason === "object" && "error" in reason ? String(reason.error) : null;
      toast({
        tone: "danger",
        title: failed === projectIds.length ? `${name} not added` : `${name} added to ${projectIds.length - failed} of ${projectIds.length} projects`,
        description: message ?? "Try again in a moment.",
      });
      return false;
    }
    afterChange();
    toast({ tone: "success", title: `${name} added to ${projectIds.length === 1 ? "1 project" : `${projectIds.length} projects`}` });
    return true;
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-prose flex-col gap-1">
        <h1 className="font-serif text-title font-semibold text-ink">Skills</h1>
        <p className="text-sm text-graphite">
          DevSheet suggests skills from the code in your repositories. Confirmed skills on visible projects appear on
          your public page; nothing suggested is shown until you confirm it.
        </p>
      </header>

      {skills === null && <Loading />}
      {skills === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-panel border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink">
          Your skills could not be loaded.
          <Button size="sm" variant="secondary" onClick={() => { setSkills(null); load(); }}>Try again</Button>
        </div>
      )}

      {Array.isArray(skills) && (
        <>
          <Part title="Suggestions" count={board.suggestions.length}>
            {board.suggestions.length > 0 ? (
              <SuggestionQueue suggestions={board.suggestions} onDecide={decide} onConfirmProject={confirmProject} />
            ) : (
              <EmptyState
                title="No suggestions waiting"
                description={list.length === 0
                  ? "Suggestions come from your repositories' languages and files. Import them on the Projects page."
                  : "New ones arrive when you sync repositories on the Projects page."}
                action={<Link href="/dashboard/projects" className="text-sm text-accent hover:underline">Go to Projects</Link>}
              />
            )}
          </Part>

          <Part title="Your skills" count={board.confirmed.reduce((n, g) => n + g.skills.length, 0)}>
            {board.confirmed.length > 0 ? (
              <YourSkills groups={board.confirmed} onRemove={remove} />
            ) : (
              <p className="text-sm text-graphite">Nothing confirmed yet. Confirm a suggestion or add a skill below.</p>
            )}
          </Part>

          {board.rejected.length > 0 && (
            <details className="group flex flex-col">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-2 font-serif text-lg text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden size={18} className="text-graphite transition-transform duration-150 group-open:rotate-90" />
                Rejected
                <span className="font-sans text-sm text-graphite tabular-nums">{board.rejected.length}</span>
              </summary>
              <p className="mt-2 text-sm text-graphite">Never suggested again for these projects unless you restore them.</p>
              <Panel className="mt-3">
                <ul className="divide-y divide-rule">
                  {board.rejected.map((s) => (
                    <li key={s.skillId} className="flex items-center justify-between gap-4 px-5 py-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="text-ink">{s.name}</span>
                        <span className="font-code text-xs break-words text-graphite">{s.projects.map((p) => p.title).join(", ")}</span>
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => restore(s)} aria-label={`Restore ${s.name}`}>Restore</Button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </details>
          )}

          <Part title="Add a skill">
            <AddSkill projects={projects} onAdd={add} />
          </Part>
        </>
      )}
    </div>
  );
}

function Part({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-baseline gap-2 font-serif text-lg text-ink">
        {title}
        {count !== undefined && <span className="font-sans text-sm text-graphite tabular-nums">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <div aria-busy aria-label="Loading skills" className="flex flex-col gap-4">
      <Skeleton className="h-6 w-40" />
      <Panel className="divide-y divide-rule">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </Panel>
    </div>
  );
}

