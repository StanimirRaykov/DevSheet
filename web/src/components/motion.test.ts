import { describe, expect, it } from "vitest";
import { motionPresets } from "./motion";

const MOVEMENT = ["x", "y", "scale"];

function hasMovement(value: unknown): boolean {
  if (typeof value === "function") return hasMovement(value(1));
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((k) => MOVEMENT.includes(k));
}

describe("motionPresets", () => {
  it("moves things when motion is allowed", () => {
    const p = motionPresets(false);
    expect(hasMovement(p.listItem.initial)).toBe(true);
    expect(hasMovement(p.step.initial)).toBe(true);
  });

  it("uses no movement at all with reduced motion", () => {
    const p = motionPresets(true);
    for (const variants of [p.listItem, p.step, p.reveal, p.revealChild]) {
      for (const state of Object.values(variants)) expect(hasMovement(state)).toBe(false);
    }
  });

  it("makes reduced-motion transitions near-instant", () => {
    const p = motionPresets(true);
    expect(p.layout.duration).toBeLessThanOrEqual(0.01);
    const animate = p.listItem.animate as { transition: { duration: number } };
    expect(animate.transition.duration).toBeLessThanOrEqual(0.01);
  });

  it("slides wizard steps in the direction of travel", () => {
    const p = motionPresets(false);
    const initial = p.step.initial as (dir: number) => { x: number };
    expect(initial(1).x).toBeGreaterThan(0);
    expect(initial(-1).x).toBeLessThan(0);
  });
});
