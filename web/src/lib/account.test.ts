import { afterEach, describe, expect, it, vi } from "vitest";
import { answerMessage, postAuth, waitText } from "./account";

afterEach(() => vi.unstubAllGlobals());

describe("postAuth", () => {
  it("reads next, error codes, field errors and Retry-After", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ next: "/welcome" }));
    expect((await postAuth("/auth/sign-in", {})).next).toBe("/welcome");

    vi.stubGlobal("fetch", async () => Response.json({ error: "too_many_attempts" }, { status: 429, headers: { "Retry-After": "90" } }));
    expect(await postAuth("/auth/sign-in", {})).toMatchObject({ status: 429, error: "too_many_attempts", retryAfter: 90 });

    vi.stubGlobal("fetch", async () => Response.json({ errors: { password: ["Use at least 10 characters."] } }, { status: 400 }));
    expect((await postAuth("/auth/register", {}, ["password"])).fields?.fields.password).toBe("Use at least 10 characters.");
  });

  it("never follows a next that leaves the site", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ next: "//evil.example" }));
    expect((await postAuth("/auth/sign-in", {})).next).toBeNull();
  });

  it("treats a network failure as status 0 with a plain message", async () => {
    vi.stubGlobal("fetch", async () => { throw new TypeError("fetch failed"); });
    const answer = await postAuth("/auth/sign-in", {});
    expect(answer.status).toBe(0);
    expect(answerMessage(answer)).toMatch(/can't reach/);
  });
});

describe("messages", () => {
  it("says how long to wait", () => {
    expect(waitText(null)).toBe("Try again in a few minutes.");
    expect(waitText(1)).toBe("Try again in 1 second.");
    expect(waitText(61)).toBe("Try again in 2 minutes.");
  });

  it("explains every error code the API sends", () => {
    const base = { status: 400, fields: null, next: null, retryAfter: null };
    for (const error of ["invalid_credentials", "email_not_confirmed", "too_many_attempts", "email_unavailable", "invalid_link", "expired_link"])
      expect(answerMessage({ ...base, error })).not.toBe("Something went wrong. Try again.");
    // The same message for a wrong email and a wrong password: it must not say which.
    expect(answerMessage({ ...base, error: "invalid_credentials" })).toMatch(/email and password/);
  });
});
