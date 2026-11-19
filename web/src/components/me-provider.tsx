"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Me } from "@/lib/api";

const MeContext = createContext<Me | null>(null);

/** Shares the account loaded by the (app) layout with the client components below it. */
export function MeProvider({ me, children }: { me: Me; children: ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

/**
 * The signed-in account inside the (app) area. The layout has already checked the login, so this is
 * never null there. After a change to the account (publish, sync), call router.refresh() to reload it.
 */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe() must be used inside the (app) layout");
  return me;
}
