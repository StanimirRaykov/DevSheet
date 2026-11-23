/** CEFR language levels are stored by the API as numbers 1 (A1) to 6 (C2). */
export const LEVELS = [
  { value: 1, label: "A1" }, { value: 2, label: "A2" }, { value: 3, label: "B1" },
  { value: 4, label: "B2" }, { value: 5, label: "C1" }, { value: 6, label: "C2" },
] as const;

/** The five Europass language skills, in the order of the Europass language table. */
export const SKILLS = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "spokenInteraction", label: "Spoken interaction" },
  { key: "spokenProduction", label: "Spoken production" },
  { key: "writing", label: "Writing" },
] as const;

export type SkillKey = (typeof SKILLS)[number]["key"];
export type LevelSet = Record<SkillKey, number | null>;

export function levelLabel(value: number | null | undefined): string {
  return LEVELS.find((l) => l.value === value)?.label ?? "";
}

/** All five skills set to the same level (or all cleared with null): the "overall level" shortcut. */
export function setAll(level: number | null): LevelSet {
  return { listening: level, reading: level, spokenInteraction: level, spokenProduction: level, writing: level };
}

/** The common level when all five skills agree and are set, otherwise null. */
export function uniformLevel(levels: LevelSet): number | null {
  const first = levels.listening;
  if (first === null) return null;
  return SKILLS.every((s) => levels[s.key] === first) ? first : null;
}

/** "B2" when uniform, otherwise only the skills that are set, e.g. "Listening B2 · Reading A2". Empty when nothing is set. */
export function summarizeLevels(levels: LevelSet): string {
  const uniform = uniformLevel(levels);
  if (uniform !== null) return levelLabel(uniform);
  return SKILLS.filter((s) => levels[s.key] !== null)
    .map((s) => `${s.label} ${levelLabel(levels[s.key])}`)
    .join(" · ");
}

/** A name and a one-line description per level, shown as hints next to the level selectors. */
export const LEVEL_INFO: Record<number, { name: string; description: string }> = {
  1: { name: "Beginner", description: "Understands and uses familiar everyday expressions and very basic phrases." },
  2: { name: "Elementary", description: "Handles short, routine exchanges about familiar things." },
  3: { name: "Intermediate", description: "Copes with most everyday situations and can describe experiences and plans." },
  4: { name: "Upper intermediate", description: "Talks with native speakers without strain and follows complex texts in their field." },
  5: { name: "Advanced", description: "Uses the language flexibly for work and study, including complex topics." },
  6: { name: "Proficient", description: "Understands almost everything and expresses things precisely, with fine shades of meaning." },
};
