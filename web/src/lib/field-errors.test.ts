import { describe, expect, it } from "vitest";
import { mapFieldErrors } from "./field-errors";

const fields = ["company", "title", "startDate", "endDate", "description"] as const;

describe("mapFieldErrors", () => {
  it("puts the API's own messages under the matching fields", () => {
    const body = { errors: { company: ["This field is required."], endDate: ["End date cannot be before the start date."] } };
    expect(mapFieldErrors(body, fields)).toEqual({
      fields: { company: "This field is required.", endDate: "End date cannot be before the start date." },
      form: null,
    });
  });

  it("keeps only the first message of a field", () => {
    expect(mapFieldErrors({ errors: { title: ["First.", "Second."] } }, fields).fields).toEqual({ title: "First." });
  });

  it("matches PascalCase keys and keys with the parameter name in front", () => {
    const body = { errors: { StartDate: ["Start date is required."], "input.Description": ["Must be at most 2000 characters."] } };
    expect(mapFieldErrors(body, fields).fields).toEqual({
      startDate: "Start date is required.",
      description: "Must be at most 2000 characters.",
    });
  });

  it("explains a value the API could not read, in plain words, under its field", () => {
    const body = {
      title: "One or more validation errors occurred.",
      status: 400,
      errors: { "$.startDate": ["The JSON value could not be converted to System.Nullable`1[System.DateOnly]. Path: $.startDate"] },
    };
    expect(mapFieldErrors(body, fields)).toEqual({
      fields: { startDate: "This value could not be read. Check it and try again." },
      form: null,
    });
  });

  it("sends errors about the whole request or an unknown field to the form", () => {
    expect(mapFieldErrors({ errors: { input: ["The input field is required."] } }, fields)).toEqual({
      fields: {},
      form: "The input field is required.",
    });
    expect(mapFieldErrors({ errors: { levels: ["A native language has no levels."] } }, fields).form).toBe("A native language has no levels.");
  });

  it("gives a general message when the answer has no errors object", () => {
    expect(mapFieldErrors(null, fields)).toEqual({ fields: {}, form: "Something in the form is not valid. Check it and try again." });
    expect(mapFieldErrors({ error: "Nope" }, fields).form).toBe("Something in the form is not valid. Check it and try again.");
  });

  it("skips empty message lists", () => {
    expect(mapFieldErrors({ errors: { company: [] } }, fields)).toEqual({ fields: {}, form: null });
  });
});
