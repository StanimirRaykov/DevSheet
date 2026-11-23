/**
 * Turns an API 400 answer into one message per form field, so each error can sit under its field.
 *
 * The API answers in two ways:
 * - its own checks: { errors: { startDate: ["End date cannot be before the start date."] } } (camelCase keys);
 * - ASP.NET model binding, when the JSON itself cannot be read (a date like "2024-13-01"):
 *   { title: "One or more validation errors occurred.", errors: { "$.startDate": ["The JSON value could not be converted …"] } },
 *   sometimes with PascalCase keys ("StartDate") or the parameter name in front ("input.StartDate").
 *
 * Errors for a field the form does not show, or for the whole request ("$", "input"), go to `form`.
 */
export interface MappedErrors {
  fields: Record<string, string>;
  form: string | null;
}

const NOT_READABLE = "This value could not be read. Check it and try again.";

export function mapFieldErrors(body: unknown, fields: readonly string[]): MappedErrors {
  const result: MappedErrors = { fields: {}, form: null };
  const errors = body && typeof body === "object" && "errors" in body ? (body as { errors: unknown }).errors : null;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    result.form = Array.isArray(errors) && typeof errors[0] === "string" ? errors[0] : "Something in the form is not valid. Check it and try again.";
    return result;
  }

  const byLower = new Map(fields.map((f) => [f.toLowerCase(), f]));
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    const messages = (Array.isArray(value) ? value : [value]).filter((m): m is string => typeof m === "string" && m.length > 0);
    if (messages.length === 0) continue;

    const fromBinding = key.startsWith("$");
    // "$.startDate" -> "startDate", "input.StartDate" -> "StartDate", "$" or "input" -> "".
    const name = key.replace(/^\$\.?/, "").split(".").pop() ?? "";
    const field = byLower.get(name.toLowerCase());
    // Model-binding messages talk about JSON and .NET types; say it plainly instead.
    const message = fromBinding || /JSON value|could not be converted/i.test(messages[0]) ? NOT_READABLE : messages[0];

    if (field) result.fields[field] ??= message;
    else result.form ??= message;
  }
  return result;
}
