"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";
import { Button, Skeleton, buttonClasses, cn } from "@/components/ui";

/**
 * What every route group's error.tsx shows: what happened, a retry, and a way out. Server errors arrive without
 * their message in production, only a digest; it is shown as a reference to match the server log.
 */
export function RouteError({
  error,
  retry,
  home,
  className,
}: {
  error: unknown;
  retry: () => void;
  /** Where "the way out" leads: the dashboard inside the app, the start page elsewhere. */
  home: { href: string; label: string };
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [retrying, startRetry] = useTransition();
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  useEffect(() => {
    console.error(error);
    // Move focus here so keyboard and screen reader users learn the page changed into an error.
    heading.current?.focus();
  }, [error]);

  return (
    <div className={cn("flex max-w-lg flex-col items-start gap-4", className)}>
      <h1 ref={heading} tabIndex={-1} className="font-serif text-title font-semibold text-ink focus:outline-none">
        This page could not be loaded
      </h1>
      <p className="text-graphite">
        Something went wrong on our side, not with anything you did. Try again; if it keeps happening, come back in a
        few minutes.
      </p>
      {digest && <p className="text-xs text-graphite">Reference: <span className="font-code">{digest}</span></p>}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button loading={retrying} onClick={() => startRetry(() => retry())}>
          <RotateCw aria-hidden size={16} /> Try again
        </Button>
        <Link href={home.href} className={buttonClasses("ghost", "md")}>{home.label}</Link>
      </div>
    </div>
  );
}

/** The inside of a dashboard page while it loads: title, intro and a few rows, at the size of the real content. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading the page" className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    </div>
  );
}
