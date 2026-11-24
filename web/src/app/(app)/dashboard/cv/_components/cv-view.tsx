"use client";

import { Check, CircleAlert, Download, ExternalLink, FileCode } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Panel, Skeleton, buttonClasses, cn } from "@/components/ui";
import type { MeSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { CV_TEMPLATES, EUROPASS_EDITOR, cvGaps, cvIncluded, cvUrl, europassXmlUrl, type CvTemplateId } from "@/lib/cv";

/**
 * Choose a template, see it as it will be downloaded, check what it contains. The preview is the real PDF from
 * the API (inline=true), so it always matches the download. Phones open it in a new tab instead.
 */
export function CvView() {
  const [template, setTemplate] = useState<CvTemplateId>("modern");
  const [summary, setSummary] = useState<MeSummary | null | "error">(null);

  const load = useCallback(async () => {
    const r = await send<MeSummary>("/api/me/summary").catch(() => null);
    setSummary(r?.data ?? "error");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load
  useEffect(() => { load(); }, [load]);

  const chosen = CV_TEMPLATES.find((t) => t.id === template)!;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-prose flex-col gap-1">
        <h1 className="font-serif text-title font-semibold text-ink">CV</h1>
        <p className="text-sm text-graphite">
          Built from your profile, your visible projects and the skills you confirmed. Nothing pending, hidden or
          only suggested is ever on it.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="cv-templates">
            <h2 id="cv-templates" className="font-serif text-lg text-ink">Template</h2>
            <div role="radiogroup" aria-labelledby="cv-templates" className="flex flex-col gap-3">
              {CV_TEMPLATES.map((t) => {
                const selected = t.id === template;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "flex items-start gap-4 rounded-panel border bg-sheet p-3 text-left transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                      selected ? "border-accent ring-1 ring-accent" : "border-rule hover:border-rule-strong",
                    )}
                  >
                    <Thumbnail template={t.id} />
                    <span className="flex min-w-0 flex-col gap-1 py-0.5">
                      <span className="flex items-baseline gap-2">
                        <span className="font-medium text-ink">{t.name}</span>
                        <span className="text-xs text-graphite">{t.format}</span>
                      </span>
                      <span className="text-sm text-graphite">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <a href={cvUrl(template)} className={buttonClasses("primary", "md", "self-start")}>
              <Download aria-hidden size={16} /> Download {chosen.name} CV
            </a>
          </section>

          <EuropassExport />

          <Included summary={summary} onRetry={() => { setSummary(null); load(); }} />
        </div>

        <Preview template={template} name={chosen.name} />
      </div>
    </div>
  );
}

function Preview({ template, name }: { template: CvTemplateId; name: string }) {
  return (
    <section aria-labelledby="cv-preview" className="flex flex-col gap-3 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="cv-preview" className="font-serif text-lg text-ink">Preview</h2>
        <a href={cvUrl(template, { preview: true })} target="_blank" rel="noopener" className={buttonClasses("ghost", "sm", "max-lg:hidden")}>
          <ExternalLink aria-hidden size={14} /> Open in a new tab
        </a>
      </div>
      {/* Phones: a PDF in a frame is too small to read, so open it full screen instead. */}
      <a href={cvUrl(template, { preview: true })} target="_blank" rel="noopener" className={buttonClasses("secondary", "md", "self-start lg:hidden")}>
        <ExternalLink aria-hidden size={16} /> Open preview
      </a>
      {/* Keyed by template: a new frame, with its loading state, for each choice. */}
      <PdfFrame key={template} src={cvUrl(template, { preview: true })} title={`${name} CV preview`} />
    </section>
  );
}

/** The official Europass format: a file to import into the Europass editor, not something DevSheet renders. */
function EuropassExport() {
  return (
    <section aria-labelledby="cv-europass" className="flex flex-col gap-3">
      <h2 id="cv-europass" className="font-serif text-lg text-ink">Europass</h2>
      <p className="text-sm text-graphite">
        The same CV as a Europass file. Import it in the official Europass editor to use their templates or apply
        where a Europass CV is asked for.
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-graphite marker:text-graphite">
        <li>Export the file.</li>
        <li>
          Open the{" "}
          <a href={EUROPASS_EDITOR} target="_blank" rel="noopener" className="text-ink underline underline-offset-2 hover:decoration-accent">
            Europass CV editor<span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          and choose to upload an existing CV.
        </li>
        <li>Give the CV a name there (Europass always asks for one) and check the sections. Projects and certifications arrive as custom sections.</li>
      </ol>
      <a href={europassXmlUrl()} className={buttonClasses("secondary", "md", "self-start")}>
        <FileCode aria-hidden size={16} /> Export for Europass
      </a>
    </section>
  );
}

function PdfFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[210/297] w-full overflow-hidden rounded-panel border border-rule bg-paper max-lg:hidden">
      {!loaded && (
        <div aria-busy aria-label="Loading the preview" className="absolute inset-0 flex flex-col gap-4 bg-sheet p-10">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
      <iframe src={src} title={title} onLoad={() => setLoaded(true)} className={cn("size-full", !loaded && "opacity-0")} />
    </div>
  );
}

function Included({ summary, onRetry }: { summary: MeSummary | null | "error"; onRetry: () => void }) {
  return (
    <section aria-labelledby="cv-included" className="flex flex-col gap-3">
      <h2 id="cv-included" className="font-serif text-lg text-ink">What&apos;s included</h2>
      {summary === null && (
        <div aria-busy aria-label="Loading what is included" className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      )}
      {summary === "error" && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-ink">
          This list could not be loaded. The preview and download still work.
          <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
      {summary !== null && summary !== "error" && <IncludedList summary={summary} />}
    </section>
  );
}

function IncludedList({ summary }: { summary: MeSummary }) {
  const rows = cvIncluded(summary);
  const gaps = cvGaps(rows);
  return (
    <>
      <p className="text-sm text-graphite">
        {gaps.length === 0 ? "Every part of the CV has something in it." : `${gaps.length === 1 ? "One part is" : `${gaps.length} parts are`} empty and left out of the CV.`}
      </p>
      <Panel>
        <ul className="flex flex-col divide-y divide-rule">
          {rows.map((r) => {
            const missing = r.count === 0;
            const gap = missing && !r.optional;
            return (
              <li key={r.key} className="flex items-start gap-3 px-4 py-3 text-sm">
                {gap
                  ? <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0 text-warning" />
                  : <Check aria-hidden size={16} className={cn("mt-0.5 shrink-0", missing ? "text-graphite" : "text-accent")} />}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {missing ? (
                    <Link href={r.href} className={cn("underline-offset-2 hover:underline", gap ? "text-ink" : "text-graphite")}>{r.empty}</Link>
                  ) : (
                    <span className="text-ink">
                      {r.label}
                      {r.key !== "about" && <span className="ml-2 text-graphite tabular-nums">{r.count}</span>}
                    </span>
                  )}
                  {r.note && <Link href={r.href} className="w-fit text-graphite underline-offset-2 hover:text-ink hover:underline">{r.note}</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

/** A sketch of each template's layout, so the cards can be told apart at a glance. */
function Thumbnail({ template }: { template: CvTemplateId }) {
  const line = "h-[3px] rounded-full bg-rule-strong";
  return (
    <span aria-hidden className="flex h-[5.25rem] w-[3.75rem] shrink-0 flex-col gap-1 rounded-[3px] border border-rule bg-paper p-1.5 shadow-sm">
      {template === "modern" ? (
        <>
          <span className="h-[5px] w-3/4 rounded-full bg-ink/70" />
          <span className={cn(line, "w-1/2 bg-accent/70")} />
          <span className="mt-1 flex flex-col gap-[3px]">
            {["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4", "w-11/12", "w-2/3"].map((w, i) => <span key={i} className={cn(line, w)} />)}
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-[2px] bg-rule-strong" />
            <span className="h-[4px] flex-1 rounded-full bg-ink/70" />
          </span>
          <span className="mt-1 grid grid-cols-[1fr_2fr] gap-x-1 gap-y-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="contents">
                <span className={cn(line, "bg-accent/50")} />
                <span className={line} />
              </span>
            ))}
          </span>
          <span className="mt-1 grid grid-cols-5 gap-[2px]">
            {Array.from({ length: 10 }, (_, i) => <span key={i} className="h-[4px] rounded-[1px] bg-rule-strong" />)}
          </span>
        </>
      )}
    </span>
  );
}
