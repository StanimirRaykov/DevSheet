import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
      <ComingSoon title="Terms" description="The terms of use for DevSheet." />
    </div>
  );
}
