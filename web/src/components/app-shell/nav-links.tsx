"use client";

import { FileText, FolderGit2, House, Settings, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { APP_NAV, isActive } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": House,
  "/dashboard/projects": FolderGit2,
  "/dashboard/skills": Sparkles,
  "/dashboard/profile": UserRound,
  "/dashboard/cv": FileText,
  "/settings": Settings,
};

/** The app's sections. Used in the desktop sidebar and in the phone drawer. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {APP_NAV.map((item) => {
        const Icon = ICONS[item.href];
        const active = isActive(item, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-3 rounded-control pr-3 pl-3 text-[0.9375rem] transition-colors duration-150",
                // The current section is marked like a pen tick in the margin.
                "before:absolute before:top-2 before:bottom-2 before:-left-px before:w-0.5 before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity",
                active
                  ? "bg-sheet font-medium text-ink shadow-[0_0_0_1px_var(--rule)] before:opacity-100"
                  : "text-graphite hover:bg-sheet/60 hover:text-ink",
              )}
            >
              <Icon aria-hidden size={17} strokeWidth={active ? 2 : 1.75} className={active ? "text-accent" : undefined} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
