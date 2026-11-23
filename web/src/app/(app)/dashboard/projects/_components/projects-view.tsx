"use client";

import { AnimatePresence } from "motion/react";
import { RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/me-provider";
import { Button, EmptyState, Input, Panel, Select, Skeleton, Tabs, buttonClasses, useToast } from "@/components/ui";
import { PUBLIC_API, type DashboardProject, type ProjectStatus } from "@/lib/api";
import { send } from "@/lib/client";
import { formatTimeAgo } from "@/lib/dates";
import {
  PROJECT_TABS, countByTab, defaultTab, visibleProjects, withPrevious, withStatus,
  type ProjectSort, type ProjectTab,
} from "@/lib/projects";
import { refreshPublicPages } from "../../../settings/actions";
import { ProjectPanel } from "./project-panel";
import { ProjectRow, TAB_ACTIONS } from "./project-row";

const TAB_LABELS: Record<ProjectTab, string> = { pending: "Pending", visible: "Visible", hidden: "Hidden" };
const CONNECT_HREF = `${PUBLIC_API}/auth/github/connect?next=${encodeURIComponent("/dashboard/projects")}`;

/** "my-repo" or "3 projects", for toasts. */
const naming = (ids: string[], projects: DashboardProject[]) =>
  ids.length === 1 ? (projects.find((p) => p.id === ids[0])?.title ?? "Project") : `${ids.length} projects`;

/**
 * Review the repositories imported from GitHub: approve them onto the public page or hide them, one by one or
 * several at once. A move shows at once; if the API refuses, the project goes back and a toast says so.
 */
export function ProjectsView() {
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<DashboardProject[] | null | "error">(null);
  const [tab, setTab] = useState<ProjectTab | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProjectSort>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const r = await send<DashboardProject[]>("/api/me/projects");
    if (!r.data) return setProjects((p) => (Array.isArray(p) ? p : "error"));
    setProjects(r.data);
    setTab((t) => t ?? defaultTab(r.data!));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);
  const counts = useMemo(() => countByTab(list), [list]);
  const shown = useMemo(() => (tab ? visibleProjects(list, { tab, query, sort }) : []), [list, tab, query, sort]);
  // Only what is on screen counts as selected: a search or a move can hide a ticked row.
  const chosen = shown.filter((p) => selected.has(p.id)).map((p) => p.id);
  const allChosen = shown.length > 0 && chosen.length === shown.length;

  function changeTab(value: string) {
    setTab(value as ProjectTab);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function save(ids: string[], status: ProjectStatus) {
    return ids.length === 1
      ? send(`/api/me/projects/${ids[0]}/status`, "PATCH", { status })
      : send("/api/me/projects/status", "PATCH", { ids, status });
  }

  /** Moves projects to a status at once, then saves; on failure they go back where they were. */
  async function move(ids: string[], status: ProjectStatus, done: string) {
    const previous = new Map(list.filter((p) => ids.includes(p.id) && p.status !== status).map((p) => [p.id, p.status]));
    if (previous.size === 0) return;
    const moving = [...previous.keys()];
    const name = naming(moving, list);
    setProjects((p) => (Array.isArray(p) ? withStatus(p, moving, status) : p));
    setSelected((s) => new Set([...s].filter((id) => !previous.has(id))));

    const r = await save(moving, status);
    if (!r.ok) {
      setProjects((p) => (Array.isArray(p) ? withPrevious(p, previous) : p));
      const reason = r.body && typeof r.body === "object" && "error" in r.body ? String(r.body.error) : null;
      toast({ tone: "danger", title: `${name} not ${done}`, description: reason ?? "Nothing changed. Try again in a moment." });
      return;
    }
    if (me.isPublished) refreshPublicPages([me.slug]);
    toast({ tone: "success", title: `${name} ${done}`, action: { label: "Undo", onClick: () => undo(previous, status) } });
  }

  /** Puts each project back to the status it had; one request per old status. */
  async function undo(previous: Map<string, ProjectStatus>, from: ProjectStatus) {
    setProjects((p) => (Array.isArray(p) ? withPrevious(p, previous) : p));
    const groups = new Map<ProjectStatus, string[]>();
    for (const [id, status] of previous) groups.set(status, [...(groups.get(status) ?? []), id]);
    const results = await Promise.all([...groups].map(([status, ids]) => save(ids, status)));
    if (results.some((r) => !r.ok)) {
      setProjects((p) => (Array.isArray(p) ? withStatus(p, [...previous.keys()], from) : p));
      toast({ tone: "danger", title: "Not undone", description: "The change stays. Try again in a moment." });
      load();
      return;
    }
    if (me.isPublished) refreshPublicPages([me.slug]);
  }

  async function sync() {
    setSyncing(true);
    const r = await send<{ added: number }>("/api/me/sync", "POST");
    setSyncing(false);
    if (!r.ok) {
      toast({ tone: "danger", title: "Sync failed", description: "GitHub did not answer. Try again in a moment." });
      return;
    }
    await load();
    router.refresh(); // the last-synced time in `me`
    const added = r.data?.added ?? 0;
    toast({ tone: "success", title: added === 0 ? "No new repositories" : `${added} new ${added === 1 ? "repository" : "repositories"} in Pending` });
    if (added > 0) changeTab("pending");
  }

  const open = list.find((p) => p.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-prose flex-col gap-1">
          <h1 className="font-serif text-title font-semibold text-ink">Projects</h1>
          <p className="text-sm text-graphite">
            Approve the repositories you want on your public page. Pending and hidden ones are never shown.
          </p>
        </div>
        {me.github ? (
          <div className="flex items-center gap-3">
            {me.github.lastSyncedAt && <span className="text-sm text-graphite">Synced {formatTimeAgo(me.github.lastSyncedAt)}</span>}
            <Button variant="secondary" loading={syncing} icon={<RefreshCw aria-hidden size={14} />} onClick={sync}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        ) : (
          <a href={CONNECT_HREF} className={buttonClasses("primary")}>Connect GitHub</a>
        )}
      </header>

      {projects === null && <LoadingRows />}
      {projects === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-panel border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink">
          Your projects could not be loaded.
          <Button size="sm" variant="secondary" onClick={() => { setProjects(null); load(); }}>Try again</Button>
        </div>
      )}

      {tab && Array.isArray(projects) && (
        <Tabs
          label="Projects by status"
          value={tab}
          onValueChange={changeTab}
          items={PROJECT_TABS.map((t) => ({
            value: t,
            label: TAB_LABELS[t],
            count: counts[t],
            content: t !== tab ? null : (
              <div className="flex flex-col gap-4">
                {counts[t] > 0 && (
                  <Toolbar query={query} onQuery={setQuery} sort={sort} onSort={setSort} />
                )}
                {shown.length > 0 ? (
                  <Panel className="overflow-hidden">
                    <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-paper/50 px-4 py-2">
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-graphite">
                        <input
                          type="checkbox"
                          checked={allChosen}
                          ref={(el) => { if (el) el.indeterminate = chosen.length > 0 && !allChosen; }}
                          onChange={() => setSelected(allChosen ? new Set() : new Set(shown.map((p) => p.id)))}
                          className="size-4 cursor-pointer accent-accent"
                        />
                        {chosen.length > 0 ? `${chosen.length} selected` : `Select all ${shown.length}`}
                      </label>
                      {chosen.length > 0 && (
                        <div className="ml-auto flex flex-wrap gap-2">
                          {TAB_ACTIONS[t].map((a) => (
                            <Button key={a.label} size="sm" variant={a.variant === "ghost" ? "secondary" : a.variant} onClick={() => move(chosen, a.status, a.done)}>
                              {a.label} selected
                            </Button>
                          ))}
                          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                        </div>
                      )}
                    </div>
                    <ul className="divide-y divide-rule">
                      <AnimatePresence initial={false}>
                        {shown.map((p) => (
                          <ProjectRow
                            key={p.id}
                            project={p}
                            tab={t}
                            selected={selected.has(p.id)}
                            onToggle={() => toggle(p.id)}
                            onOpen={() => setOpenId(p.id)}
                            onMove={(status) => move([p.id], status, TAB_ACTIONS[t].find((a) => a.status === status)!.done)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </Panel>
                ) : counts[t] > 0 ? (
                  <EmptyState
                    title={`No ${TAB_LABELS[t].toLowerCase()} projects match “${query.trim()}”`}
                    description="Search looks at names and descriptions."
                    action={<Button size="sm" variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
                  />
                ) : (
                  <TabEmpty tab={t} github={me.github !== null} syncing={syncing} onSync={sync} />
                )}
              </div>
            ),
          }))}
        />
      )}

      <ProjectPanel
        project={open}
        onClose={() => setOpenId(null)}
        onMove={(status) => open && move([open.id], status, TAB_ACTIONS[PROJECT_TABS[open.status]].find((a) => a.status === status)!.done)}
      />
    </div>
  );
}

function Toolbar({ query, onQuery, sort, onSort }: { query: string; onQuery: (q: string) => void; sort: ProjectSort; onSort: (s: ProjectSort) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search aria-hidden size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-graphite" />
        <Input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search by name or description" aria-label="Search projects" className="pl-9" />
      </div>
      <label className="flex items-center gap-2 text-sm whitespace-nowrap text-graphite">
        Sort by
        <Select value={sort} onChange={(e) => onSort(e.target.value as ProjectSort)} className="w-auto">
          <option value="updated">Last updated</option>
          <option value="stars">Stars</option>
          <option value="name">Name</option>
        </Select>
      </label>
    </div>
  );
}

function TabEmpty({ tab, github, syncing, onSync }: { tab: ProjectTab; github: boolean; syncing: boolean; onSync: () => void }) {
  if (tab === "pending") {
    return github ? (
      <EmptyState
        title="No pending repos"
        description="Sync to check GitHub for new ones. New repositories wait here until you approve or hide them."
        action={<Button size="sm" variant="secondary" loading={syncing} onClick={onSync}>Sync now</Button>}
      />
    ) : (
      <EmptyState
        title="No repositories yet"
        description="Connect GitHub to import your public repositories. They wait here until you approve them."
        action={<a href={CONNECT_HREF} className={buttonClasses("primary", "sm")}>Connect GitHub</a>}
      />
    );
  }
  if (tab === "visible") {
    return <EmptyState title="Nothing on your page yet" description="Approve projects in Pending to show them on your public page." />;
  }
  return <EmptyState title="Nothing hidden" description="Projects you hide stay here, off your public page, until you show them again." />;
}

function LoadingRows() {
  return (
    <div aria-busy className="flex flex-col gap-4" aria-label="Loading projects">
      <Skeleton className="h-10 w-72" />
      <Panel className="divide-y divide-rule">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="size-4" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </Panel>
    </div>
  );
}
