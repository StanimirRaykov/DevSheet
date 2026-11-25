import { Sheet, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Sheet role="status" className="flex w-full max-w-sm flex-col gap-6 px-6 py-8 sm:px-8" aria-busy="true" aria-label="Loading the page">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-2 h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </Sheet>
  );
}
