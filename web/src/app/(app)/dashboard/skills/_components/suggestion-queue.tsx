"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMotionPresets } from "@/components/motion-provider";
import { Button, Panel, Select } from "@/components/ui";
import type { SkillLinkKey } from "@/lib/api";
import { suggestionsByProject, type Suggestion } from "@/lib/skills";

/**
 * The skills found in the code that wait for a yes or no. Keyboard: arrow keys move between them, C confirms,
 * R rejects. After a decision the next one takes the place (and the focus) of the one that left.
 */
export function SuggestionQueue({
  suggestions,
  onDecide,
  onConfirmProject,
}: {
  suggestions: Suggestion[];
  onDecide: (s: Suggestion, status: 1 | 2) => void;
  onConfirmProject: (title: string, links: SkillLinkKey[]) => void;
}) {
  const presets = useMotionPresets();
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [focusPending, setFocusPending] = useState(false);
  const current = Math.min(active, suggestions.length - 1);
  const byProject = suggestionsByProject(suggestions);
  const [project, setProject] = useState("");
  const chosen = byProject.find((p) => p.projectId === project) ?? byProject[0];

  // After a decision by keyboard, keep the focus in the list on the row that moved up into its place.
  useEffect(() => {
    if (!focusPending) return;
    rows.current[current]?.focus();
    setFocusPending(false); // eslint-disable-line react-hooks/set-state-in-effect -- one-shot focus request
  }, [focusPending, current, suggestions.length]);

  function onKey(e: KeyboardEvent<HTMLLIElement>, i: number) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === "arrowdown" || key === "arrowup") {
      e.preventDefault();
      const next = Math.max(0, Math.min(suggestions.length - 1, i + (key === "arrowdown" ? 1 : -1)));
      setActive(next);
      rows.current[next]?.focus();
    } else if (key === "c" || key === "r") {
      e.preventDefault();
      setActive(i);
      setFocusPending(true);
      onDecide(suggestions[i], key === "c" ? 1 : 2);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {byProject.length > 1 && chosen && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-graphite">
            From project
            <Select value={chosen.projectId} onChange={(e) => setProject(e.target.value)} className="w-auto max-w-64">
              {byProject.map((p) => (
                <option key={p.projectId} value={p.projectId}>{p.title} ({p.links.length})</option>
              ))}
            </Select>
          </label>
          <Button size="sm" variant="secondary" onClick={() => onConfirmProject(chosen.title, chosen.links)}>
            Confirm all {chosen.links.length} from {chosen.title}
          </Button>
        </div>
      )}
      <Panel className="overflow-hidden">
        <ul aria-label="Suggested skills" className="divide-y divide-rule">
          <AnimatePresence initial={false}>
            {suggestions.map((s, i) => (
              <motion.li
                key={s.skillId}
                ref={(el) => { rows.current[i] = el; }}
                layout="position"
                variants={presets.listItem}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={presets.layout}
                tabIndex={i === current ? 0 : -1}
                onKeyDown={(e) => onKey(e, i)}
                onFocus={() => setActive(i)}
                aria-label={`${s.name}, found in ${s.projects.map((p) => p.title).join(", ")}`}
                className="flex flex-col gap-3 px-5 py-4 outline-none focus-visible:bg-accent-soft/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="text-xs text-graphite">{s.category}</span>
                  </p>
                  <p className="text-sm text-graphite">
                    Found in <span className="font-code text-ink">{s.projects.map((p) => p.title).join(", ")}</span>
                    {s.alreadyConfirmed && ". Already confirmed on other projects."}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => onDecide(s, 1)} aria-label={`Confirm ${s.name}`}>Confirm</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDecide(s, 2)} aria-label={`Reject ${s.name}`}>Reject</Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Panel>
      <p className="hidden text-xs text-graphite sm:block">
        Keyboard: <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move, <Kbd>C</Kbd> to confirm, <Kbd>R</Kbd> to reject.
      </p>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-rule-strong bg-sheet px-1.5 py-0.5 font-code text-[0.6875rem] text-ink">{children}</kbd>;
}

