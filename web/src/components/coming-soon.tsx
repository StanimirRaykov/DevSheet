import { EmptyState } from "@/components/ui";

/** Placeholder for a page that exists in the navigation but is built in a later issue. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-title font-semibold text-ink">{title}</h1>
      <EmptyState title="This page is not built yet" description={description} />
    </div>
  );
}
