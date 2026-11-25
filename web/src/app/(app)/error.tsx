"use client";

import { RouteError } from "@/components/route-states";

// Inside the app shell, so the navigation stays usable while one page fails.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} home={{ href: "/dashboard", label: "Go to the overview" }} />;
}
