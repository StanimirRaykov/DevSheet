import { Skeleton } from "@/components/ui";

/** The sheet of a public page while it loads, with the same frame and spacing, so nothing jumps when it arrives. */
export function PortfolioSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading the page" className="min-h-screen bg-paper sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl bg-sheet px-5 py-8 sm:rounded-panel sm:px-10 sm:py-12 sm:shadow-sheet lg:px-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Skeleton className="size-[72px] shrink-0 rounded-full" />
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-3 h-4 w-80 max-w-full" />
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="mt-10 grid gap-4 border-t border-rule pt-8 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-10">
            <Skeleton className="h-6 w-24" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
