"use client";

import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
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

/** A set of mutually exclusive choices inside a menu (for example the theme). */
export function MenuRadioGroup({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) {
  return <RadixMenu.RadioGroup value={value} onValueChange={onValueChange}>{children}</RadixMenu.RadioGroup>;
}

export function MenuRadioItem({ value, icon, children }: { value: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <RadixMenu.RadioItem
      value={value}
      // Keep the menu open so the effect of the choice is visible.
      onSelect={(e) => e.preventDefault()}
      className={cn(
        "flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 text-sm text-ink outline-none select-none",
        "data-[highlighted]:bg-paper data-[state=checked]:text-accent",
      )}
    >
      {icon && <span className="text-graphite in-data-[state=checked]:text-accent" aria-hidden>{icon}</span>}
      <span className="flex-1">{children}</span>
      <RadixMenu.ItemIndicator><Check aria-hidden size={15} /></RadixMenu.ItemIndicator>
    </RadixMenu.RadioItem>
  );
}
