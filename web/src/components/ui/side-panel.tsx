"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Details of one item, sliding in from the right over the page (a project's languages and skills). A modal
 * dialog underneath: focus stays inside, Escape or a click outside closes it, focus returns to what opened it.
 * Full width on phones.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <RadixDialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-rule bg-sheet shadow-float data-[state=closed]:animate-side-out data-[state=open]:animate-side-in"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <RadixDialog.Title className="font-code text-lg font-medium break-words text-ink">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="text-sm text-graphite">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close className="-mr-2 grid size-8 shrink-0 place-items-center rounded-control text-graphite hover:bg-paper hover:text-ink" aria-label="Close">
              <X aria-hidden size={16} />
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-rule px-6 py-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
