import Link from "next/link";

// Sign-in pages: no app navigation, just the way back to the site.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <Link href="/" className="font-serif text-lg font-semibold text-ink">DevSheet</Link>
      <main className="flex w-full flex-1 items-center justify-center py-10">{children}</main>
    </div>
  );
}
