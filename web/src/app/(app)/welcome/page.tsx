import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Welcome" };

export default function Page() {
  return <ComingSoon title="Welcome" description="A short setup that imports your GitHub projects and fills in your profile will live here." />;
}
