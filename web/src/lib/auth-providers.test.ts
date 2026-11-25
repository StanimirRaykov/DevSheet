import { afterEach, describe, expect, it, vi } from "vitest";
import { getSignInProviders, knownProviders } from "./auth-providers";

describe("knownProviders", () => {
  it("keeps known providers in display order", () => {
    expect(knownProviders(["google"])).toEqual(["google"]);
  });

  it("drops providers this app cannot show, and GitHub, which never signs in", () => {
    expect(knownProviders(["apple", "github", "google"])).toEqual(["google"]);
  });

  it("treats anything that is not a list as none", () => {
    expect(knownProviders(undefined)).toEqual([]);
    expect(knownProviders("github")).toEqual([]);
  });
});

describe("getSignInProviders", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the list from the API", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ providers: ["google"] }));
    expect(await getSignInProviders()).toEqual(["google"]);
  });

  it("is null when the API is down or answers with an error", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    expect(await getSignInProviders()).toBeNull();

    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    expect(await getSignInProviders()).toBeNull();
  });
});
