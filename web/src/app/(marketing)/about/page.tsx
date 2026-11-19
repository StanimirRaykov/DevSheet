import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return <ComingSoon title="About" description="What DevSheet is and who builds it." />;
}
