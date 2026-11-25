import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading the page" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-16 sm:px-8">
      <Skeleton className="h-12 w-full max-w-xl" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-5 w-2/3 max-w-md" />
    </div>
  );
}
