"use client";

import { RouteError } from "@/components/route-states";

export default function AuthError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} home={{ href: "/", label: "Go to the start page" }} />;
}
