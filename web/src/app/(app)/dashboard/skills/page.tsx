import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Skills" };

export default function Page() {
  return <ComingSoon title="Skills" description="Confirm suggested skills and see which projects use each one. Until then, use Overview." />;
}
