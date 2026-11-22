"use client";

import { createContext, useContext, useEffect } from "react";

type Report = (key: string, dirty: boolean) => void;

/** Forms on the settings page report here whether they have changes that are not saved yet. */
export const UnsavedChangesContext = createContext<Report>(() => {});

/**
 * Marks this form as having unsaved changes while `dirty` is true. The settings page then asks before
 * switching tabs and the browser asks before leaving the page. Unmounting clears it.
 */
export function useUnsavedChanges(key: string, dirty: boolean) {
  const report = useContext(UnsavedChangesContext);
  useEffect(() => {
    report(key, dirty);
    return () => report(key, false);
  }, [key, dirty, report]);
}
