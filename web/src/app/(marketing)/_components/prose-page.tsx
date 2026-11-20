import type { ReactNode } from "react";

/**
 * A plain reading page (about, privacy, terms): one column at a comfortable line length,
 * serif headings like the rest of the site, and an optional note above the text.
 */
export function ProsePage({ title, lead, note, children }: { title: string; lead?: string; note?: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="max-w-[42rem]">
        <h1 className="font-serif text-[2.1rem] font-semibold leading-tight text-ink sm:text-display">{title}</h1>
        {lead && <p className="mt-4 text-lg text-graphite text-pretty">{lead}</p>}
        {note && (
          <div role="note" className="mt-6 rounded-panel border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-ink">
            {note}
          </div>
        )}
        <div
          className={[
            "mt-10 text-ink",
            "[&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-title [&_h2]:font-semibold [&_h2:first-child]:mt-0",
            "[&_h3]:mt-6 [&_h3]:font-semibold",
            "[&_p]:mt-3 [&_p]:text-graphite",
            "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:text-graphite [&_li]:marker:text-rule-strong",
            "[&_strong]:font-semibold [&_strong]:text-ink",
            "[&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-accent",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </article>
  );
}

/** The draft notice shared by the privacy and terms pages. */
export const DRAFT_NOTE = (
  <>
    <strong>Draft for a university thesis.</strong> This text describes how DevSheet actually works, in plain language.
    It has not been reviewed by a lawyer and is not legal advice.
  </>
);
