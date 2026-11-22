import { describe, expect, it } from "vitest";
import { nextStep, previousStep, resolveStep } from "./welcome-steps";

describe("welcome steps", () => {
  it("skips the connect step when GitHub is already connected", () => {
    expect(resolveStep("Github", true)).toBe("Sync");
    expect(nextStep("About", true)).toBe("Sync");
    expect(previousStep("Sync", true)).toBe("About");
  });

  it("shows the connect step to an account without GitHub", () => {
    expect(resolveStep("Github", false)).toBe("Github");
    expect(nextStep("About", false)).toBe("Github");
  });

  it("goes straight to Done when GitHub is skipped, and back to it from there", () => {
    expect(nextStep("Github", false)).toBe("Done");
    expect(previousStep("Done", false)).toBe("Github");
  });

  it("runs sync, review, done in order once connected", () => {
    expect(nextStep("Sync", true)).toBe("Review");
    expect(nextStep("Review", true)).toBe("Done");
    expect(previousStep("Done", true)).toBe("Review");
    expect(previousStep("About", true)).toBeNull();
  });

  it("keeps every other saved step as it is, so returning resumes there", () => {
    expect(resolveStep("Review", true)).toBe("Review");
    expect(resolveStep("About", false)).toBe("About");
  });
});
