import type { ReactNode } from "react";
import { Sheet } from "@/components/ui";

/** The one sheet every sign-in page sits on: a title, a line of explanation, then the page's content. */
export function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <Sheet className="flex w-full max-w-sm flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-title font-semibold text-ink">{title}</h1>
        {intro && <p className="text-graphite">{intro}</p>}
      </div>
      {children}
    </Sheet>
  );
}

/** A message about the whole form. Danger for refusals, success for "sent". Announced by screen readers. */
export function Notice({ tone = "danger", children }: { tone?: "danger" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={
        tone === "danger"
          ? "rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink"
          : "rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-ink"
      }
    >
      {children}
    </div>
  );
}

/** "or" between the provider buttons and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-graphite" aria-hidden>
      <span className="h-px flex-1 bg-rule" />
      or
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

export const textLink = "text-ink underline underline-offset-2 hover:text-accent";
