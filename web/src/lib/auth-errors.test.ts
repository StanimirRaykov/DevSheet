import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("is null without an error", () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage("")).toBeNull();
  });

  it("explains known codes", () => {
    expect(authErrorMessage("login_in_use")).toMatch(/different DevSheet/);
    expect(authErrorMessage(["signed_out", "x"])).toMatch(/session ended/);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(authErrorMessage("<script>")).toBe(authErrorMessage("sign_in_failed"));
  });
});
