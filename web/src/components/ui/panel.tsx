import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * A bordered surface for grouping content in the app (a form section, a list).
 * Deliberately flat: no shadow. Floating layers use shadow-float; the user's sheet uses <Sheet>.
 */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-panel border border-rule bg-sheet", className)} {...rest} />;
}

/** The user's document (public page, CV preview): the one surface that sits on the desk like paper. */
export function Sheet({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-panel bg-sheet shadow-sheet", className)} {...rest} />;
}
