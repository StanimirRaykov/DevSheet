"use client";

import { useId, useRef, type FormEvent, type ReactNode } from "react";
import { Button, Dialog } from "@/components/ui";

/**
 * A form in a dialog: the fields, a message for errors that belong to no field, and Cancel / Save in the footer.
 * Save is disabled (and shows a spinner) while saving, so a double click cannot save twice.
 */
export function ItemDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  saving,
  formError,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  saving: boolean;
  formError?: string | null;
  onSubmit: (form: HTMLFormElement) => void;
  children: ReactNode;
}) {
  const formId = useId();
  const form = useRef<HTMLFormElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!saving && form.current) onSubmit(form.current);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title={title}
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="submit" form={formId} loading={saving}>{submitLabel}</Button>
        </>
      }
    >
      <form ref={form} id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{formError}</p>
        )}
        {children}
      </form>
    </Dialog>
  );
}

/** After a failed check, move the focus to the first field with an error, so it is seen and read out. */
export function focusFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
}
