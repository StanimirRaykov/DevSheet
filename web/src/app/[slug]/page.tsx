import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicPortfolio, SERVER_API, topLanguages } from "@/lib/api";
import { formatRange } from "@/lib/dates";
import { projectsLabel } from "@/lib/skills";

// Public pages read only stored data from our API and never call GitHub.
// Cached for a minute and shared by the page and its metadata. null = no published page with this slug.
async function loadPortfolio(slug: string): Promise<PublicPortfolio | null> {
  "use cache";
  cacheLife("minutes");
  const res = await fetch(`${SERVER_API}/api/public/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/public/${slug} failed with ${res.status}`);
  return (await res.json()) as PublicPortfolio;
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const data = await loadPortfolio((await params).slug);
  if (!data) return { title: "Page not found" };
  const name = data.profile?.fullName || data.githubLogin;
  return { title: name, description: data.profile?.headline || `${name}'s projects and skills.` };
}

async function Portfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadPortfolio(slug);
  if (!data) notFound();

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{data.profile?.fullName || data.githubLogin}</h1>
        {data.profile?.headline && <p className="text-lg text-neutral-700">{data.profile.headline}</p>}
        <p className="text-sm text-neutral-500">
          {[data.profile?.location, data.profile?.email].filter(Boolean).join(" · ")}
        </p>
        {data.profile?.summary && <p className="whitespace-pre-line pt-2 text-neutral-800">{data.profile.summary}</p>}
      </header>
      {data.skills.length > 0 && (
        <section aria-labelledby="skills-heading" className="space-y-2">
          <h2 id="skills-heading" className="text-xl font-semibold">Skills</h2>
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((s) => (
              <li key={s.name} title={s.projects.join(", ")} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
                {s.name} <span className="text-neutral-500">· {projectsLabel(s.projects.length)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.experience.length > 0 && (
        <section aria-labelledby="exp-heading" className="space-y-3">
          <h2 id="exp-heading" className="text-xl font-semibold">Experience</h2>
          <ul className="space-y-3">
            {data.experience.map((x) => (
              <li key={`${x.company}-${x.startDate}`}>
                <p className="font-semibold">{x.title} · {x.company}</p>
                <p className="text-xs text-neutral-500">{formatRange(x.startDate, x.endDate)}</p>
                {x.description && <p className="whitespace-pre-line text-sm text-neutral-700">{x.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.education.length > 0 && (
        <section aria-labelledby="edu-heading" className="space-y-3">
          <h2 id="edu-heading" className="text-xl font-semibold">Education</h2>
          <ul className="space-y-2">
            {data.education.map((x) => (
              <li key={`${x.institution}-${x.startDate}`}>
                <p className="font-semibold">{x.institution}{x.degree && ` · ${x.degree}`}</p>
                <p className="text-xs text-neutral-500">{formatRange(x.startDate, x.endDate)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2 className="text-xl font-semibold">Projects</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {data.projects.map((p) => (
          <li key={p.url} className="rounded-lg border p-4">
            <a href={p.url} className="font-semibold underline">{p.title}</a>
            <p className="text-sm text-neutral-600">{p.description}</p>
            <p className="mt-2 text-xs text-neutral-500">{topLanguages(p.languagesJson).join(" · ")} · ★ {p.stars}</p>
            {p.skills.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1">
                {p.skills.map((name) => (
                  <li key={name} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">{name}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <Portfolio params={params} />
      </Suspense>
    </main>
  );
}
