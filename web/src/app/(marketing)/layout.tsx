import Link from "next/link";

// Placeholder chrome for the public site; the real landing page and its navigation come in #28.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="font-serif text-lg font-semibold text-ink">DevSheet</Link>
        <nav aria-label="Site" className="flex items-center gap-5 text-sm text-graphite">
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/login" className="font-medium text-ink hover:text-accent">Sign in</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      <footer className="mx-auto flex w-full max-w-5xl gap-5 border-t border-rule px-4 py-6 text-sm text-graphite sm:px-8">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
      </footer>
    </div>
  );
}
