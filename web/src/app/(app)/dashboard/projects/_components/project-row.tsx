"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { useMotionPresets } from "@/components/motion-provider";
import { LanguageBar } from "@/components/language-bar";
import { Badge, Button, cn } from "@/components/ui";
import type { DashboardProject, ProjectStatus } from "@/lib/api";
import { formatTimeAgo } from "@/lib/dates";
import { languageShares } from "@/lib/portfolio";
import type { ProjectTab } from "@/lib/projects";

/** What each tab offers, as [label, the status it moves to, button look]. The same words are used in the toasts. */
export const TAB_ACTIONS: Record<ProjectTab, { label: string; done: string; status: ProjectStatus; variant: "primary" | "secondary" | "ghost" }[]> = {
  pending: [
    { label: "Approve", done: "approved", status: 1, variant: "primary" },
    { label: "Hide", done: "hidden", status: 2, variant: "ghost" },
  ],
  visible: [{ label: "Hide", done: "hidden", status: 2, variant: "secondary" }],
  hidden: [{ label: "Show", done: "shown", status: 1, variant: "secondary" }],
};

/** One repository in the list: select it, open its details, or move it with the tab's actions. */
export function ProjectRow({
  project,
  tab,
  selected,
  onToggle,
  onOpen,
  onMove,
}: {
  project: DashboardProject;
  tab: ProjectTab;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMove: (status: ProjectStatus) => void;
}) {
  const presets = useMotionPresets();
  const shares = languageShares(project.languagesJson);
  return (
    <motion.li
      layout="position"
      variants={presets.listItem}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={presets.layout}
      className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4", selected && "bg-accent-soft/40")}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${project.title}`}
          className="mt-1 size-4 shrink-0 cursor-pointer accent-accent"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={onOpen}
              aria-haspopup="dialog"
              className="min-w-0 text-left font-code text-[0.9375rem] font-medium break-words text-ink hover:text-accent hover:underline"
            >
              {project.title}
            </button>
            {project.sourceMissing && <Badge tone="warning">Source missing</Badge>}
          </div>
          {project.description && <p className="line-clamp-1 text-sm text-graphite">{project.description}</p>}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 text-xs text-graphite">
            {shares.length > 0 && <LanguageBar shares={shares} compact className="w-28" />}
            <span className="flex items-center gap-1 tabular-nums">
              <Star aria-hidden size={12} /> {project.stars}
              <span className="sr-only">{project.stars === 1 ? "star" : "stars"}</span>
            </span>
            {project.pushedAt && <span>Updated {formatTimeAgo(project.pushedAt)}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 pl-7 sm:pl-0">
        {TAB_ACTIONS[tab].map((a) => (
          <Button key={a.label} size="sm" variant={a.variant} onClick={() => onMove(a.status)} aria-label={`${a.label} ${project.title}`}>
            {a.label}
          </Button>
        ))}
      </div>
    </motion.li>
  );
}
