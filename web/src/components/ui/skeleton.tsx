import { cn } from "./cn";

/** Placeholder with the size of the content that is loading, so nothing jumps when it arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("motion-safe:animate-pulse rounded-control bg-rule/70", className)} />;
}
