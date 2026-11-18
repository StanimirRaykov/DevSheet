"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Modal dialog. Radix handles focus trapping, Escape, outside click and returning focus to the trigger.
 * Use it controlled (open + onOpenChange) or with a `trigger`.
 */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <RadixDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-panel border border-rule bg-sheet shadow-float",
            "data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in",
            className,
          )}
          // Without a description Radix warns; tell it explicitly there is none.
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="font-serif text-title text-ink">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="text-sm text-graphite">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close className="-mr-2 grid size-8 place-items-center rounded-control text-graphite hover:bg-paper hover:text-ink" aria-label="Close">
              <X aria-hidden size={16} />
            </RadixDialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-rule px-6 py-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Closes the surrounding Dialog; wrap a Button with it (asChild). */
export const DialogClose = RadixDialog.Close;
