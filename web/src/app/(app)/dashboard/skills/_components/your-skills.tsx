"use client";

import { useState } from "react";
import { Button, cn } from "@/components/ui";
import { projectsLabel, type ConfirmedSkill, type SkillBoard } from "@/lib/skills";

const list = (titles: string[]) => titles.join(", ");

/**
 * Confirmed skills by category, as the public page groups them. The number is the visible projects using the
 * skill, which is what the page shows; click a skill to see those projects.
 */
export function YourSkills({ groups, onRemove }: { groups: SkillBoard["confirmed"]; onRemove: (skill: ConfirmedSkill) => void }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => {
        const shown = g.skills.find((s) => s.skillId === open);
        return (
          <section key={g.category} className="flex flex-col gap-3" aria-labelledby={`cat-${g.category}`}>
            <h3 id={`cat-${g.category}`} className="text-sm font-medium text-graphite">{g.category}</h3>
            <ul className="flex flex-wrap gap-2">
              {g.skills.map((s) => {
                const isOpen = s.skillId === open;
                return (
                  <li key={s.skillId}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`skill-${s.skillId}`}
                      aria-label={`${s.name}, on your page through ${projectsLabel(s.onPage.length)}`}
                      onClick={() => setOpen(isOpen ? null : s.skillId)}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors duration-150",
                        isOpen ? "border-accent bg-accent-soft text-ink" : "border-rule-strong bg-sheet text-ink hover:border-graphite",
                        s.onPage.length === 0 && !isOpen && "border-dashed text-graphite",
                      )}
                    >
                      {s.name}
                      <span aria-hidden className="text-xs text-graphite tabular-nums">{s.onPage.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {shown && (
              <div id={`skill-${shown.skillId}`} className="flex flex-col items-start gap-3 rounded-panel border border-rule bg-sheet px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-ink">
                    {shown.onPage.length > 0
                      ? <>On your page through {projectsLabel(shown.onPage.length)}: <span className="font-code">{list(shown.onPage)}</span>.</>
                      : <>Not on your page: no visible project uses it.</>}
                  </p>
                  {shown.offPage.length > 0 && (
                    <p className="text-graphite">
                      Also confirmed on <span className="font-code">{list(shown.offPage)}</span>, which {shown.offPage.length === 1 ? "is" : "are"} pending or hidden.
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setOpen(null); onRemove(shown); }}>Remove {shown.name}</Button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
