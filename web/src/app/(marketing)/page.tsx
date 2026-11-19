import Link from "next/link";
import { buttonClasses } from "@/components/ui";

// Interim home page; the landing page is redesigned in #28.
export default function Home() {
  return (
    <section className="flex flex-col items-start gap-6 py-16">
      <h1 className="max-w-2xl font-serif text-display font-semibold text-ink">
        Your GitHub work, turned into a portfolio and a CV.
      </h1>
      <p className="max-w-xl text-lg text-graphite">
        DevSheet imports your public repositories, suggests the skills they show, and keeps your public page and CV in step.
      </p>
      <Link href="/login" className={buttonClasses("primary")}>Sign in</Link>
    </section>
  );
}
