"use client";

import { RouteError } from "@/components/route-states";

export default function PublicPageError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-16">
      <RouteError error={error} retry={retry} home={{ href: "/", label: "Go to DevSheet" }} />
    </main>
  );
}
