import { describe, expect, it } from "vitest";
import {
  checkAbout, checkCertification, checkEducation, checkExperience, checkLanguage, checkPeriod, fromMonth, joinMonth,
  newestFirst, splitMonth, toMonth,
} from "./career";
import { formatRange } from "./dates";

describe("months", () => {
  it("reads API dates as months and writes the first of the month back", () => {
    expect(toMonth("2024-03-15")).toBe("2024-03");
    expect(toMonth(null)).toBe("");
    expect(fromMonth("2024-03")).toBe("2024-03-01");
    expect(fromMonth("")).toBeNull();
  });

  it("keeps a half-chosen month while someone picks the other half", () => {
    expect(joinMonth("2024", "")).toBe("2024-");
    expect(joinMonth("", "03")).toBe("-03");
    expect(joinMonth("", "")).toBe("");
    expect(splitMonth("-03")).toEqual({ year: "", month: "03" });
    expect(fromMonth("2024-")).toBeNull();
  });
});

describe("checkPeriod", () => {
  it("flags an end before the start", () => {
    expect(checkPeriod("2024-05", "2024-03")).toEqual({ endDate: "End date cannot be before the start date." });
    expect(checkPeriod("2024-03", "2024-03")).toEqual({});
  });

  it("ignores the end when the period is still going on (Present)", () => {
    expect(checkPeriod("2024-05", "2020-01", { ongoing: true })).toEqual({});
    expect(checkPeriod("2024-05", "", { ongoing: true, endRequired: true })).toEqual({});
    expect(formatRange("2024-05-01", null)).toBe("May 2024 – Present");
  });

  it("asks for an end, or for marking it current, when the end is required", () => {
    expect(checkPeriod("2024-05", "", { endRequired: true })).toEqual({ endDate: "Choose when it ended, or mark it as current." });
  });

  it("asks for both halves of a month", () => {
    expect(checkPeriod("2024-", "-04")).toEqual({ startDate: "Choose both a month and a year.", endDate: "Choose both a month and a year." });
    expect(checkPeriod("", "", { startRequired: true })).toEqual({ startDate: "Choose when it started." });
  });
});

describe("form checks", () => {
  it("experience needs a title, a company and a start", () => {
    expect(checkExperience({ company: " ", title: "", startDate: "", endDate: "", current: true, description: "" })).toEqual({
      title: "This field is required.",
      company: "This field is required.",
      startDate: "Choose when it started.",
    });
  });

  it("education only needs the institution", () => {
    expect(checkEducation({ institution: "Technical University of Sofia", degree: "", startDate: "", endDate: "" })).toEqual({});
  });

  it("checks lengths, email and links on the about form", () => {
    const about = { fullName: "", headline: "", summary: "x".repeat(2001), location: "", email: "ana@", website: "ftp://x.dev", showEmailPublicly: false, showLocationPublicly: false, phone: "", showPhonePublicly: false, countryCode: "" };
    expect(checkAbout(about)).toEqual({
      summary: "Must be at most 2000 characters.",
      email: "Must be a valid email address, like ana@example.com.",
      website: "Must be a full http:// or https:// address.",
    });
  });

  it("asks for an international phone number", () => {
    const about = { fullName: "", headline: "", summary: "", location: "", email: "", website: "", showEmailPublicly: false, showLocationPublicly: false, phone: "", showPhonePublicly: false, countryCode: "" };
    const msg = "Must be an international number starting with + and the country code, for example +359 88 123 4567.";
    expect(checkAbout({ ...about, phone: "0888 123 456" })).toEqual({ phone: msg });
    expect(checkAbout({ ...about, phone: "+359 88" })).toEqual({ phone: msg });
    expect(checkAbout({ ...about, phone: "+359 88 123 4567" })).toEqual({});
    expect(checkAbout(about)).toEqual({});
  });

  it("checks the language code", () => {
    expect(checkLanguage({ name: "Bulgarian", isoCode: "BG" })).toEqual({ isoCode: "Two lower-case letters, for example \"bg\" or \"en\"." });
    expect(checkLanguage({ name: "Bulgarian", isoCode: "" })).toEqual({});
  });

  it("refuses a certification issued in the future", () => {
    const today = new Date(2026, 10, 24);
    expect(checkCertification({ name: "CKA", issuer: "", issueDate: "2026-12", url: "" }, today)).toEqual({ issueDate: "The issue date cannot be in the future." });
    expect(checkCertification({ name: "CKA", issuer: "", issueDate: "2026-11", url: "https://example.com/c/1" }, today)).toEqual({});
  });
});

describe("newestFirst", () => {
  it("puts current roles first, then the latest start", () => {
    const items = [
      { id: "old", start: "2018-01-01", end: "2020-01-01" },
      { id: "now", start: "2019-01-01", end: null },
      { id: "recent", start: "2021-01-01", end: "2023-01-01" },
      { id: "undated", start: null, end: null },
    ];
    expect(newestFirst(items, (x) => x.start, (x) => x.end).map((x) => x.id)).toEqual(["now", "recent", "old", "undated"]);
  });
});
