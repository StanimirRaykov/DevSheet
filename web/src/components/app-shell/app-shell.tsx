"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Skeleton, ToastProvider } from "@/components/ui";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="font-serif text-lg font-semibold tracking-tight text-ink">
      DevSheet
    </Link>
  );
}

/**
 * Frame of the signed-in app. Desktop (md and up): a fixed sidebar with the sections and the account
 * menu at the bottom. Phone: a top bar whose menu button opens the same sections in a drawer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);

  return (
    <ToastProvider>
      <a
        href="#content"
        className="sr-only z-50 rounded-control bg-sheet px-3 py-2 text-sm text-ink shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col gap-8 border-r border-rule px-4 py-6 md:flex">
          <div className="px-3"><Wordmark /></div>
          <nav aria-label="App" className="flex-1"><NavLinks /></nav>
          <UserMenu />
        </aside>

        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-2 backdrop-blur md:hidden">
          <RadixDialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <RadixDialog.Trigger asChild>
              <button type="button" aria-label="Open navigation" className="grid size-10 place-items-center rounded-control text-ink hover:bg-sheet/60">
                <MenuIcon aria-hidden size={20} />
              </button>
            </RadixDialog.Trigger>
            <RadixDialog.Portal>
              <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in md:hidden" />
              <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-8 border-r border-rule bg-paper px-4 py-4 shadow-float data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in md:hidden">
                <div className="flex items-center justify-between pl-3">
                  <RadixDialog.Title asChild><span><Wordmark onNavigate={close} /></span></RadixDialog.Title>
                  <RadixDialog.Description className="sr-only">Sections of DevSheet</RadixDialog.Description>
                  <RadixDialog.Close aria-label="Close navigation" className="grid size-10 place-items-center rounded-control text-graphite hover:text-ink">
                    <X aria-hidden size={20} />
                  </RadixDialog.Close>
                </div>
                <nav aria-label="App"><NavLinks onNavigate={close} /></nav>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>
          <Wordmark />
          <UserMenu compact />
        </header>

        <main id="content" tabIndex={-1} className="mx-auto w-full max-w-4xl px-4 py-8 outline-none sm:px-8 md:py-10">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}

/** Shown while the login is being checked: the shell's outline, so the page does not flash empty. */
export function ShellFallback() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="hidden flex-col gap-8 border-r border-rule px-7 py-6 md:flex">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-5 w-32" />)}
        </div>
      </div>
      <div className="h-14 border-b border-rule md:hidden" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:px-8 md:py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  );
}
