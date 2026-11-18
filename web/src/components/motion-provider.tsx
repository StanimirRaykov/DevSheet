"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { motionPresets, type MotionPresets } from "./motion";

/**
 * Wraps the app. reducedMotion="user" makes the motion library itself drop transform and layout animations
 * when the operating system asks for reduced motion, as a safety net under the presets.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** The presets for the current user setting. Use these instead of writing transitions inline. */
export function useMotionPresets(): MotionPresets {
  return motionPresets(useReducedMotion() ?? false);
}
