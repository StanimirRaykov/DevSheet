import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return <ComingSoon title="Projects" description="Review, order and hide the projects imported from GitHub. Until then, use Overview." />;
}
