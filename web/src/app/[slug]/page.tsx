import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicPortfolio, SERVER_API, topLanguages } from "@/lib/api";
import { projectsLabel } from "@/lib/skills";

// Public pages read only stored data from our API and never call GitHub.
async function Portfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${SERVER_API}/api/public/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  if (res.status === 404) notFound();
  const data = (await res.json()) as PublicPortfolio;

  return (
    <>
      <h1 className="text-3xl font-bold">{data.githubLogin}</h1>
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
