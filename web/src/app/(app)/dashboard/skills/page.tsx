import type { Metadata } from "next";
import { SkillsView } from "./_components/skills-view";

export const metadata: Metadata = { title: "Skills" };

export default function Page() {
  return <SkillsView />;
}
