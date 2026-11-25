import Link from "next/link";
import { buttonClasses } from "@/components/ui";

/** Something inside the app that does not exist (or no longer does), shown inside the shell. */
export default function AppNotFound() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <h1 className="font-serif text-title font-semibold text-ink">Nothing here</h1>
      <p className="text-graphite">This page does not exist, or what it showed has been removed.</p>
      <Link href="/dashboard" className={buttonClasses("secondary", "md")}>Go to the overview</Link>
    </div>
  );
}
