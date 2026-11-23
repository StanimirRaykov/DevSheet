"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageBar } from "@/components/language-bar";
import { Badge, Button, SidePanel, buttonClasses, type BadgeTone } from "@/components/ui";
import type { DashboardProject, ProjectStatus } from "@/lib/api";
import { formatTimeAgo } from "@/lib/dates";
import { languageShares } from "@/lib/portfolio";
import { PROJECT_TABS } from "@/lib/projects";
import { TAB_ACTIONS } from "./project-row";

const STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone; hint: string }> = {
  0: { label: "Pending", tone: "warning", hint: "Not on your public page until you approve it." },
  1: { label: "Visible", tone: "success", hint: "Shown on your public page when the page is published." },
  2: { label: "Hidden", tone: "neutral", hint: "Never shown on your public page." },
};

/** Everything about one project; the status can be changed from here too. Skills are edited on the Skills page. */
export function ProjectPanel({
  project,
  onClose,
  onMove,
}: {
  project: DashboardProject | null;
  onClose: () => void;
  onMove: (status: ProjectStatus) => void;
}) {
  const status = project ? STATUS[project.status] : null;
  const skills = project ? project.skills.filter((s) => s.status !== 2) : [];
  return (
    <SidePanel
      open={project !== null}
      onOpenChange={(open) => !open && onClose()}
      title={project?.title ?? ""}
      description={status?.hint}
      footer={
        project && (
          <>
            <a href={project.url} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm", "mr-auto")}>
              <ExternalLink aria-hidden size={14} /> Open on GitHub
            </a>
            {TAB_ACTIONS[PROJECT_TABS[project.status]].map((a) => (
              <Button key={a.label} size="sm" variant={a.variant === "ghost" ? "secondary" : a.variant} onClick={() => onMove(a.status)}>
                {a.label}
              </Button>
            ))}
          </>
        )
      }
    >
      {project && status && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {project.sourceMissing && <Badge tone="warning">Source missing</Badge>}
          </div>
          {project.sourceMissing && (
            <p className="text-sm text-graphite">
              This repository is no longer on GitHub, or GitHub is disconnected. It stays here with the last synced
              details until you hide it.
            </p>
          )}

          <Part title="Description">
            {project.description
              ? <p className="text-sm leading-relaxed whitespace-pre-line text-ink">{project.description}</p>
              : <p className="text-sm text-graphite">No description on GitHub.</p>}
          </Part>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-graphite">Stars</dt>
              <dd className="flex items-center gap-1 text-ink tabular-nums"><Star aria-hidden size={14} /> {project.stars}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-graphite">Last updated</dt>
              <dd className="text-ink">{project.pushedAt ? formatTimeAgo(project.pushedAt) : "Unknown"}</dd>
            </div>
          </dl>

          <Part title="Languages">
            {languageShares(project.languagesJson, 6).length > 0
              ? <LanguageBar shares={languageShares(project.languagesJson, 6)} />
              : <p className="text-sm text-graphite">GitHub found no code languages.</p>}
          </Part>

          <Part
            title="Skills"
            aside={<Link href="/dashboard/skills" className="text-sm text-accent hover:underline">Manage skills</Link>}
          >
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <li key={s.skillId} className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-0.5 text-xs text-ink">
                    {s.name}
                    {s.status === 0 && <span className="text-graphite">(suggested)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite">No skills linked yet.</p>
            )}
          </Part>
        </div>
      )}
    </SidePanel>
  );
}

function Part({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
