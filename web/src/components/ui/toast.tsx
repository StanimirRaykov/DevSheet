"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "danger";
  /** e.g. { label: "Undo", onClick } — the label doubles as the alt text for screen readers. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it closes on its own. Default 5000. */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

/** Shows short confirmations ("Published", "Project hidden") with an optional action such as Undo. */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((options: ToastOptions) => {
    setToasts((list) => [...list, { ...options, id: nextId++ }]);
  }, []);
  const remove = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" label="Notifications">
        {children}
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClosed={() => remove(t.id)} />
        ))}
        <RadixToast.Viewport className="fixed right-0 bottom-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClosed }: { toast: ToastEntry; onClosed: () => void }) {
  const Icon = toast.tone === "danger" ? CircleAlert : toast.tone === "success" ? CircleCheck : null;
  return (
    <RadixToast.Root
      duration={toast.duration ?? 5000}
      // Errors interrupt (assertive); confirmations wait their turn (polite).
      type={toast.tone === "danger" ? "foreground" : "background"}
      onOpenChange={(open) => !open && onClosed()}
      className={cn(
        "flex items-start gap-3 rounded-panel border border-rule bg-sheet p-3.5 shadow-float",
        "data-[state=closed]:animate-toast-out data-[state=open]:animate-toast-in",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
      )}
    >
      {Icon && <Icon aria-hidden size={18} className={cn("mt-0.5 shrink-0", toast.tone === "danger" ? "text-danger" : "text-success")} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <RadixToast.Title className="text-sm font-medium text-ink">{toast.title}</RadixToast.Title>
        {toast.description && <RadixToast.Description className="text-sm text-graphite">{toast.description}</RadixToast.Description>}
      </div>
      {toast.action && (
        <RadixToast.Action
          altText={toast.action.label}
          onClick={toast.action.onClick}
          className="h-8 shrink-0 rounded-control px-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          {toast.action.label}
        </RadixToast.Action>
      )}
      <RadixToast.Close aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-control text-graphite hover:bg-paper hover:text-ink">
        <X aria-hidden size={14} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
