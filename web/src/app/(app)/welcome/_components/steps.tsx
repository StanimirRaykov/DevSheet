"use client";

import { Check, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { GithubMark } from "@/components/github-mark";
import { Button, EmptyState, Field, Input, Spinner, buttonClasses, cn } from "@/components/ui";
import { PUBLIC_API, topLanguages, type DashboardProject } from "@/lib/api";
import { send, type FieldErrors } from "@/lib/client";
import type { WelcomeStep } from "./welcome-steps";

export interface OnboardingView {
  step: WelcomeStep;
  completedAt: string | null;
  displayName: string;
  headline: string;
  githubLogin: string | null;
  lastSyncedAt: string | null;
}

/** Where connecting GitHub comes back to: this flow, which then moves on to the first sync. */
export const CONNECT_GITHUB_HREF = `${PUBLIC_API}/auth/github/connect?next=${encodeURIComponent("/welcome")}`;

/** Heading, body and the Back / Next row every step shares. The heading takes focus when the step appears. */
function StepFrame({
  title,
  description,
  children,
  onBack,
  actions,
}: {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  onBack?: (() => void) | null;
  actions: ReactNode;
}) {
  return (
    <section aria-labelledby="welcome-step-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="welcome-step-title" tabIndex={-1} className="font-serif text-title font-semibold text-ink outline-none">{title}</h2>
        <p className="max-w-prose text-graphite">{description}</p>
      </div>
      {children}
      <div className="flex flex-wrap-reverse items-center justify-between gap-3 border-t border-rule pt-5">
        {onBack ? <Button type="button" variant="ghost" onClick={onBack}>Back</Button> : <span />}
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      </div>
    </section>
  );
}

// ---- 1. About you ----

export function AboutStep({ view, onSaved }: { view: OnboardingView; onSaved: (view: OnboardingView) => void }) {
  const [name, setName] = useState(view.displayName);
  const [headline, setHeadline] = useState(view.headline);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await send<OnboardingView>("/api/me/onboarding/about", "PUT", { displayName: name, headline });
    setSaving(false);
    if (r.data) onSaved(r.data);
    else setErrors(Object.keys(r.errors).length ? r.errors : { form: ["Your details were not saved. Try again in a moment."] });
  }

  return (
    <form onSubmit={save} noValidate>
      <StepFrame
        title="About you"
        description="How you appear at the top of your page and your CV. You can change both later."
        actions={<Button type="submit" loading={saving}>Next</Button>}
      >
        <div className="flex max-w-md flex-col gap-5">
          <Field label="Name" error={errors.displayName?.[0]}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </Field>
          <Field label="Headline" hint="One line about what you do, like “Backend developer, .NET and PostgreSQL”." error={errors.headline?.[0]}>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} />
          </Field>
          {errors.form && <p role="alert" className="text-sm text-danger">{errors.form[0]}</p>}
        </div>
      </StepFrame>
    </form>
  );
}

// ---- 2. Connect GitHub ----

export function GithubStep({ error, onBack, onSkip }: { error: string | null; onBack: () => void; onSkip: () => void }) {
  return (
    <StepFrame
      title="Connect GitHub"
      description="DevSheet reads your public repositories and suggests skills from their languages. It never writes to GitHub."
      onBack={onBack}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onSkip}>Skip for now</Button>
          <a href={CONNECT_GITHUB_HREF} className={buttonClasses("primary", "md")}>
            <GithubMark size={16} /> Connect GitHub
          </a>
        </>
      }
    >
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{error}</p>}
      <p className="max-w-prose text-sm text-graphite">
        Without GitHub you can still fill in your profile, work history and skills by hand, and connect it later in Settings.
      </p>
    </StepFrame>
  );
}

// ---- 3. First sync ----

export type SyncState =
  | { status: "running" }
  | { status: "done"; added: number; total: number }
  | { status: "error" };

/** Runs the sync while the step is open (once: the result is kept by the flow when going back and forth). */
export function SyncStep({
  login,
  state,
  onState,
  onBack,
  onNext,
}: {
  login: string;
  state: SyncState | null;
  onState: (state: SyncState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  async function run() {
    onState({ status: "running" });
    const r = await send<{ added: number }>("/api/me/sync", "POST");
    if (!r.data) return onState({ status: "error" });
    const projects = await send<DashboardProject[]>("/api/me/projects");
    onState({ status: "done", added: r.data.added, total: projects.data?.length ?? r.data.added });
  }

  useEffect(() => {
    if (state === null) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once, when the step first opens
  }, []);

  const running = state === null || state.status === "running";
  return (
    <StepFrame
      title="First sync"
      description={<>Importing the repositories of <span className="font-medium text-ink">{login}</span>. Nothing becomes public.</>}
      onBack={onBack}
      actions={
        state?.status === "error"
          ? <Button type="button" variant="secondary" onClick={onNext}>Continue without syncing</Button>
          : <Button type="button" disabled={running} onClick={onNext}>Next</Button>
      }
    >
      <div aria-live="polite" className="rounded-panel border border-rule bg-sheet px-5 py-6">
        {running && (
          <p className="flex items-center gap-3 text-ink"><Spinner /> Reading your repositories from GitHub…</p>
        )}
        {state?.status === "done" && (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-ink">
              <Check aria-hidden className="size-5 text-success" />
              {state.total === 0 ? "No public repositories found." : `${state.total} ${state.total === 1 ? "repository" : "repositories"} found.`}
            </p>
            {state.total > 0 && state.added < state.total && (
              <p className="text-sm text-graphite">{state.added} of them are new since the last sync.</p>
            )}
          </div>
        )}
        {state?.status === "error" && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-ink">The sync did not finish. GitHub may be busy, or the connection needs renewing.</p>
            <Button type="button" variant="secondary" size="sm" onClick={run} icon={<RotateCw aria-hidden className="size-4" />}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </StepFrame>
  );
}

// ---- 4. Review projects ----

export function ReviewStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [pending, setPending] = useState<DashboardProject[] | null | "error">(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    send<DashboardProject[]>("/api/me/projects").then((r) =>
      setPending(r.data ? r.data.filter((p) => p.status === 0) : "error"),
    );
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function approve() {
    if (selected.size === 0) return onDone();
    setSaving(true);
    const results = await Promise.all(
      [...selected].map((id) => send(`/api/me/projects/${id}/status`, "PATCH", { status: 1 })),
    );
    setSaving(false);
    if (results.every((r) => r.ok)) onDone();
    else setFailed(true);
  }

  const list = Array.isArray(pending) ? pending : [];
  const allSelected = list.length > 0 && selected.size === list.length;
  return (
    <StepFrame
      title="Review projects"
      description="Pick the repositories you want on your page. The rest stay waiting on the dashboard. Nothing is public until you publish your page."
      onBack={onBack}
      actions={
        <Button type="button" loading={saving} onClick={approve}>
          {selected.size === 0 ? "Next" : `Approve ${selected.size} and continue`}
        </Button>
      }
    >
      {pending === null && <p className="flex items-center gap-3 text-graphite"><Spinner /> Loading your repositories…</p>}
      {pending === "error" && <p role="alert" className="text-danger">Your repositories could not be loaded. You can review them later on the dashboard.</p>}
      {Array.isArray(pending) && pending.length === 0 && (
        <EmptyState title="Nothing waiting for review" description="New repositories show up here and on the dashboard after each sync." />
      )}
      {list.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Repositories to approve</legend>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-graphite">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((p) => p.id)))}
              className="size-4 accent-accent"
            />
            Select all {list.length}
          </label>
          <ul className="divide-y divide-rule rounded-panel border border-rule bg-sheet">
            {list.map((p) => (
              <li key={p.id}>
                <label className={cn("flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-paper/60", selected.has(p.id) && "bg-accent-soft/40")}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="mt-1 size-4 shrink-0 accent-accent" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium break-words text-ink">{p.title}</span>
                    {p.description && <span className="text-sm text-graphite">{p.description}</span>}
                    {topLanguages(p.languagesJson).length > 0 && (
                      <span className="text-sm text-graphite">{topLanguages(p.languagesJson).join(", ")}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {failed && <p role="alert" className="text-sm text-danger">Some projects were not approved. Try again, or approve them on the dashboard.</p>}
        </fieldset>
      )}
    </StepFrame>
  );
}

// ---- 5. Done ----

export function DoneStep({ slug, published, onBack, onFinish, finishing }: { slug: string; published: boolean; onBack: () => void; onFinish: () => void; finishing: boolean }) {
  const links = [
    { href: "/dashboard/skills", title: "Skills", text: "Confirm the skills suggested from your projects." },
    { href: "/dashboard/profile", title: "Profile", text: "Add a summary, work history and education for your CV." },
    { href: "/settings?tab=public-page", title: `Your page at /${slug}`, text: published ? "Published. Choose what it shows in Settings." : "Publish it when it looks right. Until then only you can see it." },
  ];
  return (
    <StepFrame
      title="You're set up"
      description="Your DevSheet is ready to fill in. These are good next stops."
      onBack={onBack}
      actions={<Button type="button" loading={finishing} onClick={onFinish}>Go to dashboard</Button>}
    >
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex flex-col gap-0.5 rounded-panel border border-rule bg-sheet px-4 py-3 transition-colors hover:border-rule-strong">
              <span className="font-medium text-ink">{l.title}</span>
              <span className="text-sm text-graphite">{l.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </StepFrame>
  );
}
