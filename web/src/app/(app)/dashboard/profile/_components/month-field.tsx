"use client";

import { useId, type ReactNode } from "react";
import { Select } from "@/components/ui";
import { joinMonth, splitMonth } from "@/lib/career";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FIRST_YEAR = 1960;

/**
 * A month and a year, as two selects (Safari has no month picker). The value is "YYYY-MM"; while one half is
 * still empty it is "2024-" or "-03", so the choice is kept and the form check can ask for the other half.
 */
export function MonthField({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  yearsAhead = 0,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  /** How many years after this one can be chosen, e.g. for an expected graduation. */
  yearsAhead?: number;
}) {
  const id = useId();
  const { year, month } = splitMonth(value);
  const last = new Date().getFullYear() + yearsAhead;
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => String(last - i));
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={describedBy} disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <Select
          aria-label={`${label}, month`}
          aria-invalid={error ? true : undefined}
          value={disabled ? "" : month}
          onChange={(e) => onChange(joinMonth(year, e.target.value))}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
        </Select>
        <Select
          aria-label={`${label}, year`}
          aria-invalid={error ? true : undefined}
          value={disabled ? "" : year}
          onChange={(e) => onChange(joinMonth(e.target.value, month))}
        >
          <option value="">Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-graphite">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
