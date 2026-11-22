"use client";

import { useId, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * An on/off setting that applies at once (no Save button). role="switch", so screen readers say "on" or "off";
 * Space and Enter toggle it like any button. The label is clickable too.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className={cn("text-sm font-medium text-ink", !disabled && "cursor-pointer")}>{label}</label>
        {description && <p id={`${id}-description`} className="text-sm text-graphite">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-rule-strong bg-paper",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-4 rounded-full shadow-sm transition-transform duration-150 ease-settle",
            checked ? "translate-x-[1.125rem] bg-on-accent" : "translate-x-[0.1875rem] bg-graphite",
          )}
        />
      </button>
    </div>
  );
}
