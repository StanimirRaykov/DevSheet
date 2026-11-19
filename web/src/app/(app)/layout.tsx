import { Suspense, type ReactNode } from "react";
import { AppShell, ShellFallback } from "@/components/app-shell/app-shell";
import { MeProvider } from "@/components/me-provider";
import { requireMe } from "@/lib/session";

// Everything in (app) needs a login. The check runs once here, on the server, for every page below.
async function Guarded({ children }: { children: ReactNode }) {
  const me = await requireMe();
  return <MeProvider me={me}>{children}</MeProvider>;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Guarded>
        <AppShell>{children}</AppShell>
      </Guarded>
    </Suspense>
  );
}
