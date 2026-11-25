"use client";

import { RouteError } from "@/components/route-states";

export default function MarketingError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
      <RouteError error={error} retry={retry} home={{ href: "/", label: "Go to the start page" }} />
    </div>
  );
}
