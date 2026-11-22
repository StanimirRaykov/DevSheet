"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMotionPresets } from "@/components/motion-provider";
import { useMe } from "@/components/me-provider";
import { Button, Skeleton, cn } from "@/components/ui";
import { send } from "@/lib/client";
import { AboutStep, DoneStep, GithubStep, ReviewStep, SyncStep, type OnboardingView, type SyncState } from "./steps";
import { STEP_NAMES, WELCOME_STEPS, nextStep, previousStep, resolveStep, type WelcomeStep } from "./welcome-steps";

/** Leaves the flow for the dashboard. A prop, so tests can see it happen. */
export function WelcomeFlow({ error, leave }: { error: string | null; leave?: (path: string) => void }) {
  const [view, setView] = useState<OnboardingView | null | "error">(null);

  useEffect(() => {
    send<OnboardingView>("/api/me/onboarding").then((r) => setView(r.data ?? "error"));
  }, []);

  if (view === null) return <Skeleton className="h-80 w-full" />;
  if (view === "error")
    return <p role="alert" className="text-danger">The welcome steps could not be loaded. Reload the page to try again.</p>;
  return <Flow initial={view} error={error} leave={leave} />;
}

function Flow({ initial, error, leave }: { initial: OnboardingView; error: string | null; leave?: (path: string) => void }) {
  const router = useRouter();
  const me = useMe();
  const presets = useMotionPresets();
  const [view, setView] = useState(initial);
  const connected = view.githubLogin !== null;
  const [step, setStep] = useState<WelcomeStep>(() => resolveStep(initial.step, connected));
  const [direction, setDirection] = useState(1);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [moved, setMoved] = useState(false);
  const go = leave ?? ((path: string) => router.push(path));

  // Coming back from GitHub on the connect step: save that the flow moved on.
  useEffect(() => {
    if (step !== initial.step) send("/api/me/onboarding/step", "PUT", { step });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only for the step the page opened on
  }, []);

  function moveTo(target: WelcomeStep, dir: 1 | -1, save = true) {
    setDirection(dir);
    setMoved(true);
    setStep(target);
    if (save) send("/api/me/onboarding/step", "PUT", { step: target });
    // Reaching the end counts as finishing, even if the dashboard button is never pressed.
    if (target === "Done") send("/api/me/onboarding/complete", "POST");
  }
  const forward = () => moveTo(nextStep(step, connected), 1);
  const back = () => {
    const previous = previousStep(step, connected);
    if (previous) moveTo(previous, -1);
  };

  async function finish() {
    setFinishing(true);
    await send("/api/me/onboarding/complete", "POST");
    router.refresh();
    go("/dashboard");
  }

  const visible = WELCOME_STEPS.filter((s) => !(s === "Github" && connected));
  const index = visible.indexOf(step);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-title font-semibold tracking-tight text-ink sm:text-display">Welcome to DevSheet</h1>
          <p className="text-graphite">A few steps to a page and CV worth sending.</p>
        </div>
        {step !== "Done" && (
          <Button variant="ghost" size="sm" loading={finishing} onClick={finish}>Skip setup</Button>
        )}
      </div>

      <Progress steps={visible} index={index} />

      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={presets.step}
            initial="initial"
            animate="animate"
            exit="exit"
            // Once a new step is in place its heading takes focus, so keyboard and screen reader users start at its top.
            onAnimationComplete={(name) => {
              if (moved && name === "animate") document.getElementById("welcome-step-title")?.focus({ preventScroll: true });
            }}
          >
            {step === "About" && (
              <AboutStep
                view={view}
                onSaved={(saved) => {
                  setView(saved);
                  moveTo(nextStep("About", connected), 1, false); // the API already saved the next step
                }}
              />
            )}
            {step === "Github" && <GithubStep error={error} onBack={back} onSkip={forward} />}
            {step === "Sync" && view.githubLogin && (
              <SyncStep login={view.githubLogin} state={sync} onState={setSync} onBack={back} onNext={forward} />
            )}
            {step === "Review" && <ReviewStep onBack={back} onDone={forward} />}
            {step === "Done" && <DoneStep slug={me.slug} published={me.isPublished} onBack={back} onFinish={finish} finishing={finishing} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The steps by name, with a bar for how far along the flow is. */
function Progress({ steps, index }: { steps: readonly WelcomeStep[]; index: number }) {
  return (
    <nav aria-label="Setup progress" className="flex flex-col gap-3">
      <div className="h-1 overflow-hidden rounded-full bg-rule" aria-hidden>
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-settle motion-reduce:transition-none"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>
      <ol className="hidden gap-5 text-sm whitespace-nowrap sm:flex">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === index ? "step" : undefined}
            className={cn(i === index ? "font-medium text-ink" : i < index ? "text-graphite" : "text-graphite/60")}
          >
            <span className="sr-only">{i < index ? "Done: " : i === index ? "Current: " : ""}</span>
            {STEP_NAMES[s]}
          </li>
        ))}
      </ol>
      {/* Phones have no room for every name: the current one, with how far along it is. Also read out on each change. */}
      <p className="text-sm text-graphite sm:sr-only" aria-live="polite">
        Step {index + 1} of {steps.length}: <span className="font-medium text-ink">{STEP_NAMES[steps[index]]}</span>
      </p>
    </nav>
  );
}
