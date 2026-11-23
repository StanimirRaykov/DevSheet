import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Any address with nothing to show: an unknown URL, an unknown public page, or one that is not published.
 * The wording is the same in every case, so it never hints whether someone uses an address.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-16">
      <div className="flex max-w-md flex-col items-start gap-4">
        <p className="font-code text-sm text-graphite">404</p>
        <h1 className="font-serif text-display font-semibold tracking-tight text-ink">Nothing here</h1>
        <p className="text-graphite">
          There is no page at this address. If someone sent you a link to their DevSheet, it may have moved or not be
          published yet.
        </p>
        <Link href="/" className={buttonClasses("secondary", "md", "mt-2")}>Go to DevSheet</Link>
      </div>
    </main>
  );
}
