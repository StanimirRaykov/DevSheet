import type { Transition, Variants } from "motion/react";

/*
  Motion presets. Rule from the design plan: motion answers what the user did (an item is added, removed,
  moved between lists, a step changes). No decorative entrances on every section. One orchestrated reveal
  per page at most (e.g. the landing hero), using `reveal`.
  Every preset has a reduced-motion form: opacity only, no movement, near-instant.
*/

export const EASE_SETTLE = [0.2, 0.7, 0.2, 1] as const;

export const durations = { fast: 0.16, base: 0.22, slow: 0.4 } as const;

export interface MotionPresets {
  /** Items in a list that can be added, removed or moved (projects, skills). Use with layout + AnimatePresence. */
  listItem: Variants;
  /** Wizard steps (onboarding): the new step comes in from the direction of travel. `custom` = 1 forward, -1 back. */
  step: Variants;
  /** The single page-load reveal, staggered over its children. */
  reveal: Variants;
  revealChild: Variants;
  /** Transition for layout changes (an item moving to its new place). */
  layout: Transition;
}

export function motionPresets(reduced: boolean): MotionPresets {
  if (reduced) {
    const fade: Variants = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    const instant: Transition = { duration: 0.01 };
    return {
      listItem: withTransition(fade, instant),
      step: withTransition(fade, instant),
      reveal: { initial: {}, animate: {} },
      revealChild: withTransition(fade, instant),
      layout: instant,
    };
  }

  const base: Transition = { duration: durations.base, ease: EASE_SETTLE };
  return {
    listItem: {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0, transition: base },
      exit: { opacity: 0, scale: 0.98, transition: { duration: durations.fast, ease: "easeIn" } },
    },
    step: {
      initial: (dir: number = 1) => ({ opacity: 0, x: 24 * dir }),
      animate: { opacity: 1, x: 0, transition: base },
      exit: (dir: number = 1) => ({ opacity: 0, x: -24 * dir, transition: { duration: durations.fast, ease: "easeIn" } }),
    },
    reveal: { initial: {}, animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } },
    revealChild: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0, transition: { duration: durations.slow, ease: EASE_SETTLE } },
    },
    layout: { duration: durations.base, ease: EASE_SETTLE },
  };
}

function withTransition(variants: Variants, transition: Transition): Variants {
  return Object.fromEntries(
    Object.entries(variants).map(([key, value]) => [key, typeof value === "object" ? { ...value, transition } : value]),
  );
}
