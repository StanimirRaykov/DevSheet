import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { parseSettingsTab } from "./settings-tab-names";
import { SettingsTabs } from "./settings-tabs";
import { useUnsavedChanges } from "./unsaved-changes";

function EditableField() {
  const [value, setValue] = useState("");
  useUnsavedChanges("field", value !== "");
  return <input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />;
}

const panels = {
  account: <EditableField />,
  "sign-in": <p>Sign-in panel</p>,
  "public-page": <p>Public page panel</p>,
  delete: <p>Delete panel</p>,
};

describe("parseSettingsTab", () => {
  it("accepts known tabs and falls back to account", () => {
    expect(parseSettingsTab("public-page")).toBe("public-page");
    expect(parseSettingsTab(["delete", "x"])).toBe("delete");
    expect(parseSettingsTab("billing")).toBe("account");
    expect(parseSettingsTab(undefined)).toBe("account");
  });
});

describe("SettingsTabs", () => {
  it("opens the tab from the address and keeps the address in step", async () => {
    render(<SettingsTabs initialTab="sign-in" panels={panels} />);
    expect(screen.getByText("Sign-in panel")).toBeVisible();

    await userEvent.click(screen.getByRole("tab", { name: "Public page" }));

    expect(screen.getByText("Public page panel")).toBeVisible();
    expect(new URL(window.location.href).searchParams.get("tab")).toBe("public-page");
  });

  it("switches at once when nothing is unsaved", async () => {
    render(<SettingsTabs initialTab="account" panels={panels} />);
    await userEvent.click(screen.getByRole("tab", { name: "Delete account" }));
    expect(screen.getByText("Delete panel")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before leaving a tab with unsaved changes, and stays when told to keep editing", async () => {
    render(<SettingsTabs initialTab="account" panels={panels} />);
    await userEvent.type(screen.getByLabelText("Name"), "Ana");

    await userEvent.click(screen.getByRole("tab", { name: "Public page" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Ana");
  });

  it("discards the changes and switches when told to", async () => {
    render(<SettingsTabs initialTab="account" panels={panels} />);
    await userEvent.type(screen.getByLabelText("Name"), "Ana");

    await userEvent.click(screen.getByRole("tab", { name: "Public page" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getByText("Public page panel")).toBeVisible();
    // Back on Account the form starts clean, so switching again does not ask.
    await userEvent.click(screen.getByRole("tab", { name: "Account" }));
    await userEvent.click(screen.getByRole("tab", { name: "Delete account" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
