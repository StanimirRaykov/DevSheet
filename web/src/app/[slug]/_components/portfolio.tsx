import { Download, Globe, Mail, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GithubMark } from "@/components/github-mark";
import { LanguageBar } from "@/components/language-bar";
import { Avatar, buttonClasses, cn } from "@/components/ui";
import { PUBLIC_API, type PublicPortfolio } from "@/lib/api";
import { summarizeLevels } from "@/lib/cefr";
import { formatMonth, formatRange } from "@/lib/dates";
import { displayUrl, languageShares, skillMatrix } from "@/lib/portfolio";

/*
  The public page is the developer's sheet: one page of paper on the desk, set like a printed CV. Section names
  hang in a left column; the skills matrix is the one graphic, a row of dots per skill lined up with the numbered
  project list. Server-rendered with no client JavaScript.
*/

/** More projects than this and a row of dots stops being readable: the row shows a count instead. */
const MAX_DOTS = 16;

export function Portfolio({ data }: { data: PublicPortfolio }) {
  const name = data.profile?.fullName || data.displayName;
  const matrix = skillMatrix(data);

  return (
    <div className="min-h-screen bg-paper sm:px-6 sm:py-10 print:bg-white print:p-0">
      <article className="mx-auto max-w-4xl bg-sheet px-5 py-8 sm:rounded-panel sm:px-10 sm:py-12 sm:shadow-sheet lg:px-14 print:max-w-none print:p-0 print:shadow-none">
        <Header data={data} name={name} />

        {data.profile?.summary && (
          <Section id="about" title="About">
            <p className="max-w-prose text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink">{data.profile.summary}</p>
          </Section>
        )}

        {matrix.length > 0 && (
          <Section id="skills" title="Skills">
            {data.projects.length > 1 && data.projects.length <= MAX_DOTS && (
              <p className="mb-5 text-sm text-graphite print:mb-2">Each dot is one of the projects below, in the same order. A filled dot means the skill was used there.</p>
            )}
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 print:grid-cols-3 print:gap-y-3">
              {matrix.map((group) => (
                <div key={group.category} className="break-inside-avoid">
                  <h3 className="mb-1 text-sm font-medium text-graphite">{group.category}</h3>
                  <ul className="divide-y divide-rule">
                    {group.rows.map((row) => (
                      <li key={row.name} title={`Used in ${row.projects.join(", ")}`} className="flex items-center justify-between gap-4 py-1.5 print:py-0.5">
                        <span className="text-ink">{row.name}</span>
                        {data.projects.length > 1 && data.projects.length <= MAX_DOTS ? (
                          <span aria-hidden className="flex shrink-0 gap-1">
                            {row.used.map((used, i) => (
                              <span
                                key={i}
                                className={cn("size-2.5 rounded-full", used ? "bg-accent print:bg-black" : "bg-rule print:border print:border-black/30 print:bg-white")}
                              />
                            ))}
                          </span>
                        ) : (
                          <span aria-hidden className="shrink-0 text-sm text-graphite tabular-nums">{row.projects.length}</span>
                        )}
                        <span className="sr-only">: used in {row.projects.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.projects.length > 0 && (
          <Section id="projects" title="Projects">
            <ol className="grid gap-4 sm:grid-cols-2 print:grid-cols-3 print:gap-2">
              {data.projects.map((p, i) => (
                <li key={p.url} className="break-inside-avoid">
                  <ProjectCard project={p} number={i + 1} />
                </li>
              ))}
            </ol>
          </Section>
        )}

        {data.experience.length > 0 && (
          <Section id="experience" title="Experience">
            <ol className="relative flex flex-col gap-7 border-l border-rule pl-6 print:gap-3">
              {data.experience.map((x) => (
                <li key={`${x.company}-${x.startDate}`} className="relative break-inside-avoid">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-2 -left-[1.8125rem] size-2.5 rounded-full border-2 border-accent print:border-black",
                      x.endDate === null ? "bg-accent print:bg-black" : "bg-sheet",
                    )}
                  />
                  <h3 className="font-medium text-ink">{x.title}, {x.company}</h3>
                  <p className="text-sm text-graphite tabular-nums">{formatRange(x.startDate, x.endDate)}</p>
                  {x.description && <p className="mt-2 max-w-prose text-sm leading-relaxed whitespace-pre-line text-ink">{x.description}</p>}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {data.education.length > 0 && (
          <Section id="education" title="Education">
            <ul className="flex flex-col gap-4">
              {data.education.map((x) => (
                <li key={`${x.institution}-${x.startDate}`} className="break-inside-avoid">
                  <h3 className="font-medium text-ink">{x.degree ? `${x.degree}, ${x.institution}` : x.institution}</h3>
                  {formatRange(x.startDate, x.endDate) && <p className="text-sm text-graphite tabular-nums">{formatRange(x.startDate, x.endDate)}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {data.languages.length > 0 && (
          <Section id="languages" title="Languages">
            <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-2">
              {data.languages.map((l) => (
                <div key={l.name} className="contents">
                  <dt className="font-medium text-ink">{l.name}</dt>
                  <dd className="text-graphite">{l.isMotherTongue ? "Native" : summarizeLevels(l) || "Level not given"}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {data.certifications.length > 0 && (
          <Section id="certifications" title="Certifications">
            <ul className="flex flex-col gap-3">
              {data.certifications.map((c) => (
                <li key={`${c.name}-${c.issueDate}`} className="break-inside-avoid">
                  <h3 className="font-medium text-ink">
                    {c.url ? <a href={c.url} className="underline decoration-rule-strong underline-offset-4 hover:decoration-accent">{c.name}</a> : c.name}
                  </h3>
                  {(c.issuer || c.issueDate) && (
                    <p className="text-sm text-graphite">{[c.issuer, c.issueDate && formatMonth(c.issueDate)].filter(Boolean).join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>

      <footer className="mx-auto max-w-4xl px-5 py-8 text-sm text-graphite sm:px-0 print:hidden">
        Made with <Link href="/" className="font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">DevSheet</Link>
      </footer>
    </div>
  );
}

function Header({ data, name }: { data: PublicPortfolio; name: string }) {
  const p = data.profile;
  const contact: { key: string; icon: ReactNode; label: string; href?: string }[] = [];
  if (p?.location) contact.push({ key: "location", icon: <MapPin size={16} />, label: p.location });
  if (p?.email) contact.push({ key: "email", icon: <Mail size={16} />, label: p.email, href: `mailto:${p.email}` });
  if (p?.phone) contact.push({ key: "phone", icon: <Phone size={16} />, label: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, "")}` });
  if (data.githubLogin)
    contact.push({ key: "github", icon: <GithubMark size={16} />, label: `github.com/${data.githubLogin}`, href: `https://github.com/${data.githubLogin}` });
  if (p?.website) contact.push({ key: "website", icon: <Globe size={16} />, label: displayUrl(p.website), href: p.website });

  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={name} src={data.avatarUrl} size={72} className="shrink-0 print:hidden" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-serif text-[2rem] leading-tight font-semibold tracking-tight text-ink sm:text-display print:text-[22pt]">{name}</h1>
          {p?.headline && <p className="text-lg text-graphite">{p.headline}</p>}
          {contact.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {contact.map((c) => (
                <li key={c.key} className="flex min-w-0 items-center gap-1.5 text-graphite">
                  <span aria-hidden className="shrink-0 print:hidden">{c.icon}</span>
                  {c.href ? (
                    <a href={c.href} className="truncate text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent">{c.label}</a>
                  ) : (
                    <span className="truncate">{c.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {data.cvDownload && (
        <a href={`${PUBLIC_API}/api/public/${data.slug}/cv.pdf`} className={buttonClasses("secondary", "md", "shrink-0 self-start print:hidden")}>
          <Download aria-hidden size={16} /> Download CV
        </a>
      )}
    </header>
  );
}

/** A section with its name in the left margin on wide screens, as on a printed CV. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="mt-10 grid gap-4 border-t border-rule pt-8 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-10 print:mt-4 print:grid-cols-[7rem_minmax(0,1fr)] print:gap-4 print:pt-3"
    >
      <h2 id={`${id}-heading`} className="font-serif text-xl font-semibold text-ink md:text-lg print:text-base">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ProjectCard({ project, number }: { project: PublicPortfolio["projects"][number]; number: number }) {
  const shares = languageShares(project.languagesJson);
  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-panel border border-rule p-4 transition-[border-color,transform] duration-200 ease-settle hover:border-rule-strong motion-safe:hover:-translate-y-0.5 print:p-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-code text-[0.9375rem] font-medium break-words text-ink">
          <span aria-hidden className="mr-2 text-graphite tabular-nums">{number}</span>
          {/* The whole card is the link; the title names it. */}
          <a href={project.url} className="after:absolute after:inset-0 after:rounded-panel group-hover:text-accent">{project.title}</a>
        </h3>
        {project.stars > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-sm text-graphite tabular-nums">
            <Star aria-hidden size={14} /> {project.stars}
            <span className="sr-only">{project.stars === 1 ? "star" : "stars"}</span>
          </span>
        )}
      </div>
      {project.description && <p className="text-sm leading-relaxed text-graphite">{project.description}</p>}
      <LanguageBar shares={shares} className="mt-auto" />
      {project.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 print:hidden" aria-label="Skills">
          {project.skills.map((s) => (
            <li key={s} className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
