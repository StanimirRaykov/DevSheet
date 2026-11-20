import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EyeOff, FileText, Globe, ListChecks } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { AuthCta, StartLink } from "./_components/auth-cta";
import { HeroPreview } from "./_components/hero-preview";
import { DEMO_SLUG } from "./_components/site-links";

export const metadata: Metadata = {
  title: { absolute: "DevSheet: your GitHub work as a portfolio and a CV" },
  description:
    "DevSheet reads your public GitHub repositories, suggests the skills they show, and turns what you approve into a public page and a PDF CV.",
};

const STEPS = [
  {
    title: "Connect GitHub",
    text: "Sign in with GitHub. DevSheet reads your public repositories and their languages. Nothing private, and nothing is published yet.",
  },
  {
    title: "Confirm your skills",
    text: "Each repository comes with suggested skills. Keep the ones that are true, reject the rest, add what the languages don't show.",
  },
  {
    title: "Share your page and CV",
    text: "Publish a page at your own address and download a CV as a PDF, in a modern layout or one that follows Europass.",
  },
];

const FEATURES = [
  {
    icon: EyeOff,
    title: "Nothing is public until you approve it",
    text: "New repositories arrive hidden. You choose which projects appear, and only skills you confirmed are ever shown.",
  },
  {
    icon: ListChecks,
    title: "Skills with evidence",
    text: "Every skill on your page links to the projects that use it, so a reader can see where you used it, not just a list of words.",
  },
  {
    icon: FileText,
    title: "A CV from the same data",
    text: "Your work history, education, languages and confirmed skills become a PDF CV. Change a project once and both stay in step.",
  },
  {
    icon: Globe,
    title: "One public page",
    text: "A page at your own address, like /ana-petrova, with your projects, skills and experience. Email and location stay private unless you choose otherwise.",
  },
];

const FAQ = [
  {
    q: "What does DevSheet read from GitHub?",
    a: "Your public profile and public repositories: names, descriptions, stars and languages. It asks only for the read:user permission, so it cannot see private repositories or change anything on GitHub.",
  },
  {
    q: "What is public?",
    a: "Nothing, until you publish your page. After that, only the projects you approved and the skills you confirmed, plus the profile text you wrote. Email and location are hidden unless you turn them on.",
  },
  {
    q: "How do I delete my account?",
    a: "Account deletion is coming to the Settings page. It removes your account and everything in it at once. Until then, open an issue in the project's repository and it will be done by hand.",
  },
  {
    q: "Does it cost anything?",
    a: "No. DevSheet is a final-year university project, not a business.",
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-14">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-serif text-[2.25rem] font-semibold leading-[1.08] text-ink text-balance sm:text-[3.05rem]">
            Your repositories, written up as a portfolio and a CV.
          </h1>
          <p className="max-w-[34rem] text-lg text-graphite text-pretty">
            DevSheet reads your public GitHub work and suggests the skills it shows. You confirm what is true, and that
            becomes a public page and a PDF CV.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Suspense fallback={<StartLink />}>
              <AuthCta />
            </Suspense>
            <Link href={`/${DEMO_SLUG}`} className={buttonClasses("secondary")}>See an example</Link>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section aria-labelledby="how-heading" className="border-t border-rule bg-sheet">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
          <h2 id="how-heading" className="font-serif text-title font-semibold text-ink">How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 md:flex-col md:gap-3">
                <span aria-hidden="true" className="font-serif text-[2.5rem] font-semibold leading-none text-accent">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-graphite">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <h2 id="features-heading" className="font-serif text-title font-semibold text-ink">What you get</h2>
        <ul className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <Icon aria-hidden="true" size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 max-w-[30rem] text-graphite">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="example-heading" className="border-y border-rule bg-sheet">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h2 id="example-heading" className="font-serif text-title font-semibold text-ink">See a finished page</h2>
            <p className="mt-1 text-graphite">A public page for a made-up developer, built with the same data as above.</p>
          </div>
          <Link href={`/${DEMO_SLUG}`} className={buttonClasses("secondary")}>Open the example</Link>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <h2 id="faq-heading" className="font-serif text-title font-semibold text-ink">Questions</h2>
        <div className="mt-6 max-w-3xl divide-y divide-rule border-y border-rule">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="text-xl leading-none text-graphite transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-graphite">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
