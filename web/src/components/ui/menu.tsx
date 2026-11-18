"use client";

import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Dropdown menu (user menu, row actions). Keyboard: Enter/Space opens, arrows move, Escape closes. */
export function Menu({ trigger, children, align = "end" }: { trigger: ReactNode; children: ReactNode; align?: "start" | "end" }) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-48 rounded-panel border border-rule bg-sheet p-1 shadow-float data-[state=open]:animate-menu-in"
        >
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export function MenuItem({
  children,
  icon,
  onSelect,
  tone = "default",
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <RadixMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 text-sm outline-none select-none",
        "data-[disabled]:opacity-50 data-[highlighted]:bg-paper",
        tone === "danger" ? "text-danger" : "text-ink",
      )}
    >
      {icon && <span className="text-graphite" aria-hidden>{icon}</span>}
      {children}
    </RadixMenu.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className="px-2.5 py-1.5 text-xs text-graphite">{children}</RadixMenu.Label>;
}

export function MenuSeparator() {
  return <RadixMenu.Separator className="my-1 h-px bg-rule" />;
}
