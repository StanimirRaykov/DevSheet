/**
 * The welcome flow's order, as plain functions so the rules can be tested without rendering anything.
 * Names match OnboardingStep in the API. "Github" is skipped whenever GitHub is already connected; without
 * GitHub there is nothing to sync or review, so skipping it goes straight to "Done".
 */
export const WELCOME_STEPS = ["About", "Github", "Sync", "Review", "Done"] as const;
export type WelcomeStep = (typeof WELCOME_STEPS)[number];

export const STEP_NAMES: Record<WelcomeStep, string> = {
  About: "About you",
  Github: "Connect GitHub",
  Sync: "First sync",
  Review: "Review projects",
  Done: "Done",
};

/** The step to show for a saved step: a connected account never sees the connect step. */
export function resolveStep(saved: WelcomeStep, githubConnected: boolean): WelcomeStep {
  return saved === "Github" && githubConnected ? "Sync" : saved;
}

export function nextStep(step: WelcomeStep, githubConnected: boolean): WelcomeStep {
  switch (step) {
    case "About": return githubConnected ? "Sync" : "Github";
    case "Github": return githubConnected ? "Sync" : "Done";
    case "Sync": return "Review";
    default: return "Done";
  }
}

/** Null on the first step. */
export function previousStep(step: WelcomeStep, githubConnected: boolean): WelcomeStep | null {
  switch (step) {
    case "About": return null;
    case "Github": return "About";
    case "Sync": return githubConnected ? "About" : "Github";
    case "Review": return "Sync";
    case "Done": return githubConnected ? "Review" : "Github";
  }
}

export function isWelcomeStep(value: unknown): value is WelcomeStep {
  return typeof value === "string" && (WELCOME_STEPS as readonly string[]).includes(value);
}
