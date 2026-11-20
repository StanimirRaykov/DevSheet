import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
      <ComingSoon title="About" description="What DevSheet is and who builds it." />
    </div>
  );
}
