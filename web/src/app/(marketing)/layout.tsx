import Link from "next/link";
import { Suspense } from "react";
import { AuthCta, SignInLink, StartLink } from "./_components/auth-cta";
import { FOOTER_LINKS, NAV_LINKS } from "./_components/site-links";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-sheet focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="font-serif text-xl font-semibold text-ink">DevSheet</Link>
        <nav aria-label="Site" className="flex items-center gap-4 sm:gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-graphite hover:text-ink">{l.label}</Link>
          ))}
          <Suspense fallback={null}>
            <SignInLink />
          </Suspense>
          <Suspense fallback={<StartLink size="sm" />}>
            <AuthCta size="sm" />
          </Suspense>
        </nav>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-graphite sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>DevSheet is a final-year project. It is not a company and has no paid plans.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                {l.href.startsWith("/") ? (
                  <Link href={l.href} className="hover:text-ink">{l.label}</Link>
                ) : (
                  <a href={l.href} className="hover:text-ink">{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
