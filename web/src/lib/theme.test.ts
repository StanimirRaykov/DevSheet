import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyThemePreference,
  parseThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "./theme";

function mockSystemDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query === "(prefers-color-scheme: dark)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.unstubAllGlobals());

describe("parseThemePreference", () => {
  it("keeps the three known values", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });
  it("falls back to system for missing or unknown values", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("blue")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("uses the explicit choice regardless of the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the system when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("applyThemePreference", () => {
  it("stores the choice and sets data-theme on <html>", () => {
    mockSystemDark(false);
    expect(applyThemePreference("dark")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference()).toBe("dark");
  });
  it("resolves system against the media query", () => {
    mockSystemDark(true);
    expect(applyThemePreference("system")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const run = () => new Function(THEME_INIT_SCRIPT)();

  it("applies a stored explicit choice", () => {
    mockSystemDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    run();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("follows the system when nothing valid is stored", () => {
    mockSystemDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "nonsense");
    run();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
