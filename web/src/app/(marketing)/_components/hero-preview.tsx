"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, Badge, Panel, Sheet, cn } from "@/components/ui";
import { EASE_SETTLE } from "@/components/motion";

/*
  The landing page's one orchestrated moment: the product in four beats, built from the real UI pieces
  with fictional data. 1) repositories arrive from GitHub, 2) skills are suggested on them,
  3) the suggestions are confirmed, 4) the confirmed skills appear on the public sheet.
  It plays once; with reduced motion the finished state is shown straight away.
*/

const REPOS = [
  { name: "ledger-api", languages: "C# · PostgreSQL", skills: ["C#", "PostgreSQL"] },
  { name: "trail-maps", languages: "TypeScript · CSS", skills: ["TypeScript", "React"] },
  { name: "pi-weather", languages: "Python", skills: ["Python"] },
];

const SHEET_SKILLS = [
  { name: "C#", projects: 1 },
  { name: "PostgreSQL", projects: 1 },
  { name: "TypeScript", projects: 1 },
  { name: "React", projects: 1 },
  { name: "Python", projects: 1 },
];

const LAST_STAGE = 4;
const STAGE_DELAYS = [400, 900, 1100, 900]; // ms before stages 1..4

export function HeroPreview() {
  const reduced = useReducedMotion() ?? false;
  const [stage, setStage] = useState(0);
  const shown = reduced ? LAST_STAGE : stage;

  useEffect(() => {
    if (reduced) return;
    let next = 1;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      setStage(next);
      if (next < LAST_STAGE) timer = setTimeout(step, STAGE_DELAYS[next++]);
    };
    timer = setTimeout(step, STAGE_DELAYS[0]);
    return () => clearTimeout(timer);
  }, [reduced]);

  const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: EASE_SETTLE } };

  return (
    <div
      role="img"
      aria-label="Example: three GitHub repositories with their suggested skills confirmed, and the developer's public page listing those skills."
      className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-start"
    >
      <Panel className="p-3" aria-hidden="true">
        <p className="px-1 pb-2 text-xs font-medium text-graphite">Synced from GitHub</p>
        <ul className="flex flex-col gap-2">
          {REPOS.map((repo, i) => (
            <motion.li
              key={repo.name}
              initial={false}
              animate={shown >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: EASE_SETTLE, delay: reduced ? 0 : i * 0.12 }}
              className="rounded-control border border-rule bg-paper px-3 py-2"
            >
              <p className="font-mono text-[0.8125rem] text-ink">{repo.name}</p>
              <p className="text-xs text-graphite">{repo.languages}</p>
              <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
                {shown >= 2 &&
                  repo.skills.map((skill) => (
                    <motion.span key={skill} {...(reduced ? {} : enter)}>
                      <SkillChip name={skill} confirmed={shown >= 3} />
                    </motion.span>
                  ))}
              </div>
            </motion.li>
          ))}
        </ul>
      </Panel>

      <Sheet className="flex flex-col gap-4 p-5" aria-hidden="true">
        <div className="flex items-center gap-3">
          <Avatar name="Ana Petrova" size={44} />
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold leading-tight text-ink">Ana Petrova</p>
            <p className="text-sm text-graphite">Backend developer, Plovdiv</p>
          </div>
        </div>
        <p className="text-sm text-graphite">
          I build APIs and the tools around them. Recently: a double-entry ledger and a hiking map for Rhodope trails.
        </p>
        <div>
          <p className="pb-2 font-serif text-sm font-semibold text-ink">Skills</p>
          <ul className="flex min-h-[4.25rem] flex-wrap content-start gap-1.5">
            <AnimatePresence>
              {shown >= 4 &&
                SHEET_SKILLS.map((s, i) => (
                  <motion.li
                    key={s.name}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE_SETTLE, delay: reduced ? 0 : i * 0.07 }}
                  >
                    <Badge tone="accent">{s.name}</Badge>
                  </motion.li>
                ))}
            </AnimatePresence>
          </ul>
        </div>
        <div className="border-t border-rule pt-3">
          <p className="pb-1 font-serif text-sm font-semibold text-ink">Projects</p>
          <p className="text-sm text-graphite">ledger-api · trail-maps · pi-weather</p>
        </div>
      </Sheet>
    </div>
  );
}

function SkillChip({ name, confirmed }: { name: string; confirmed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors duration-300",
        confirmed ? "border-transparent bg-success-soft text-success" : "border-dashed border-rule-strong text-graphite",
      )}
    >
      {confirmed && <Check size={12} aria-hidden="true" />}
      {name}
      {!confirmed && "?"}
    </span>
  );
}
