import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "CV" };

export default function Page() {
  return <ComingSoon title="CV" description="Preview each CV template before downloading it. Until then, download from Overview." />;
}
