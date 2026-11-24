"use client";

import { animate, useReducedMotion } from "motion/react";
import { Check, ChevronRight, Download, ExternalLink, FolderGit2, RefreshCw, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMe } from "@/components/me-provider";
import { Badge, Button, Panel, Skeleton, buttonClasses, cn, useToast } from "@/components/ui";
import { PUBLIC_API, type MeSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { completeness, completenessItems } from "@/lib/completeness";
import { formatTimeAgo } from "@/lib/dates";

/**
 * The first page after sign-in: how complete the profile is and what to do next, what waits for a decision,
 * GitHub sync, and the common actions. Everything comes from one call, GET /api/me/summary.
 */
export function Overview() {
  const me = useMe();
  const [summary, setSummary] = useState<MeSummary | null | "error">(null);

  const load = useCallback(async () => {
    const r = await send<MeSummary>("/api/me/summary").catch(() => null);
    setSummary(r?.data ?? "error");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-title font-semibold text-ink">Hi, {me.displayName}</h1>
          <PageStatus summary={summary} />
        </div>
        {summary !== null && summary !== "error" && <QuickActions summary={summary} />}
      </header>

      {summary === null && <Loading />}
      {summary === "error" && (
        <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-panel border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink">
          Your overview could not be loaded.
          <Button size="sm" variant="secondary" onClick={() => { setSummary(null); load(); }}>Try again</Button>
        </div>
      )}
      {summary !== null && summary !== "error" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Completeness summary={summary} />
          <div className="flex flex-col gap-6">
            <Attention summary={summary} />
            <GitHub summary={summary} onSynced={load} />
          </div>
        </div>
      )}
    </div>
  );
}

function PageStatus({ summary }: { summary: MeSummary | null | "error" }) {
  if (summary === null || summary === "error") return <p className="h-5 text-sm text-graphite" />;
  return summary.isPublished ? (
    <p className="flex flex-wrap items-center gap-2 text-sm text-graphite">
      <Badge tone="success">Published</Badge>
      <span>Your page is live at <Link href={`/${summary.slug}`} className="font-code text-ink underline-offset-2 hover:underline">/{summary.slug}</Link></span>
    </p>
  ) : (
    <p className="flex flex-wrap items-center gap-2 text-sm text-graphite">
      <Badge>Draft</Badge>
      <span>Only you can see your page. <Link href="/settings?tab=public-page" className="text-accent underline-offset-2 hover:underline">Publish it</Link> when it is ready.</span>
    </p>
  );
}

function QuickActions({ summary }: { summary: MeSummary }) {
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
      {/* A plain link: the browser sends the login cookie and downloads the PDF the API returns. */}
      <a href={`${PUBLIC_API}/api/me/cv.pdf?template=modern`} className={buttonClasses("primary", "md")}>
        <Download aria-hidden size={16} /> Download CV
      </a>
      {summary.isPublished && (
        <Link href={`/${summary.slug}`} className={buttonClasses("secondary", "md")}>
          <ExternalLink aria-hidden size={16} /> View public page
        </Link>
      )}
      <Link href="/dashboard/profile" className={buttonClasses("secondary", "md")}>
        <UserRound aria-hidden size={16} /> Edit profile
      </Link>
    </nav>
  );
}

/** A number that counts up from 0 when it first appears; straight to the value when motion is reduced or the page is hidden. */
function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A page opened in a background tab gets no animation frames: show the number at once.
    if (reduced || document.hidden) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(0, value, { duration: 0.8, ease: [0.2, 0.7, 0.2, 1], onUpdate: (v) => { el.textContent = String(Math.round(v)); } });
    return () => controls.stop();
  }, [value, reduced]);

  return <span ref={ref}>{reduced ? value : 0}</span>;
}

function Completeness({ summary }: { summary: MeSummary }) {
  const items = completenessItems(summary);
  const score = completeness(items);
  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <Panel className="flex flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-lg text-ink">Profile completeness</h2>
          <p className="text-sm text-graphite">
            {score === 100 ? "Everything a reader looks for is there." : "What a reader of your page and CV will miss."}
          </p>
        </div>
        <p className="font-serif text-5xl leading-none font-semibold text-ink tabular-nums" aria-label={`${score} percent complete`}>
          <CountUp value={score} /><span className="ml-0.5 text-2xl text-graphite">%</span>
        </p>
      </div>

      <div role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full origin-left rounded-full bg-accent transition-[width] duration-700 ease-settle" style={{ width: `${score}%` }} />
      </div>

      {todo.length > 0 && (
        <ul className="flex flex-col divide-y divide-rule border-y border-rule" aria-label="Still to do">
          {todo.map((i) => (
            <li key={i.key}>
              <Link href={i.href} className="group flex items-center gap-3 py-3 text-sm text-ink transition-colors duration-150 hover:text-accent">
                <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-rule-strong" />
                <span className="flex-1">{i.todo}</span>
                {i.progress && <span className="text-xs text-graphite tabular-nums">{i.progress}</span>}
                <span className="text-xs text-graphite tabular-nums">+{i.weight}%</span>
                <ChevronRight aria-hidden size={16} className="text-graphite transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer list-none text-graphite hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden size={14} className="mr-1 inline transition-transform duration-150 group-open:rotate-90" />
            {done.length} of {items.length} done
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((i) => (
              <li key={i.key} className="flex items-center gap-3 text-graphite">
                <Check aria-hidden size={16} className="text-accent" />
                <span className="line-through decoration-rule-strong">{i.todo}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

function Attention({ summary }: { summary: MeSummary }) {
  const pending = summary.projects.pending;
  const suggested = summary.suggestedSkills;
  const rows: { key: string; count: number; text: string; href: string; icon: ReactNode }[] = [
    { key: "repos", count: pending, text: pending === 1 ? "repository waits for approval" : "repositories wait for approval", href: "/dashboard/projects", icon: <FolderGit2 aria-hidden size={18} /> },
    { key: "skills", count: suggested, text: suggested === 1 ? "suggested skill to confirm or reject" : "suggested skills to confirm or reject", href: "/dashboard/skills", icon: <Sparkles aria-hidden size={18} /> },
  ];
  const waiting = rows.filter((r) => r.count > 0);

  return (
    <Panel className="flex flex-col gap-3 px-6 py-5">
      <h2 className="font-serif text-lg text-ink">Needs your attention</h2>
      {waiting.length === 0 ? (
        <p className="text-sm text-graphite">Nothing waiting. New repositories and skills show up here after a sync.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {waiting.map((r) => (
            <li key={r.key}>
              <Link href={r.href} aria-label={`${r.count} ${r.text}`} className="group -mx-2 flex items-center gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-accent-soft/40">
                <span className="text-graphite">{r.icon}</span>
                <span className="font-serif text-2xl leading-none text-ink tabular-nums"><CountUp value={r.count} /></span>
                <span className="flex-1 text-sm text-ink">{r.text}</span>
                <ChevronRight aria-hidden size={16} className="text-graphite transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function GitHub({ summary, onSynced }: { summary: MeSummary; onSynced: () => Promise<void> }) {
  const router = useRouter();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    const r = await send<{ added: number }>("/api/me/sync", "POST").catch(() => null);
    setSyncing(false);
    if (!r?.ok) {
      toast({ tone: "danger", title: "Sync failed", description: "GitHub did not answer. Try again in a moment." });
      return;
    }
    await onSynced();
    router.refresh(); // the last-synced time in `me`
    const added = r.data?.added ?? 0;
    toast({ tone: "success", title: added === 0 ? "No new repositories" : `${added} new ${added === 1 ? "repository" : "repositories"} in Pending` });
  }

  return (
    <Panel className="flex flex-col gap-3 px-6 py-5">
      <h2 className="font-serif text-lg text-ink">GitHub</h2>
      {summary.github ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-graphite">
            <span className="font-code text-ink">{summary.github.login}</span>
            <br />
            {summary.github.lastSyncedAt ? `Synced ${formatTimeAgo(summary.github.lastSyncedAt)}` : "Not synced yet"}
          </p>
          <Button variant="secondary" loading={syncing} icon={<RefreshCw aria-hidden size={14} />} onClick={sync}>
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-graphite">Connect GitHub to import your repositories as projects and find your skills in their code.</p>
          <a href={`${PUBLIC_API}/auth/github/connect?next=/dashboard`} className={buttonClasses("secondary", "md")}>Connect GitHub</a>
        </div>
      )}
    </Panel>
  );
}

function Loading() {
  return (
    <div aria-busy aria-label="Loading your overview" className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel className="flex flex-col gap-5 px-6 py-6">
        <div className="flex justify-between"><Skeleton className="h-6 w-48" /><Skeleton className="h-12 w-20" /></div>
        <Skeleton className="h-2 w-full" />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
      </Panel>
      <div className="flex flex-col gap-6">
        {[0, 1].map((i) => (
          <Panel key={i} className={cn("flex flex-col gap-3 px-6 py-5")}>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-full" />
          </Panel>
        ))}
      </div>
    </div>
  );
}
