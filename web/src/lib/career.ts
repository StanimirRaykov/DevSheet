/**
 * Pure helpers for the profile and career forms: month values, the checks that give instant feedback before
 * the API answers, and list order. The limits match the API's CareerValidator.
 */

export const SHORT_MAX = 200;
export const LONG_MAX = 2000;
export const EMAIL_MAX = 254;

export type Errors = Record<string, string>;

// ---------------- months ----------------
// A month in a form is "YYYY-MM". While someone is choosing, one half may still be empty: "2024-" or "-03".

/** "2024-03-15" from the API -> "2024-03". Nothing -> "". */
export function toMonth(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}-${m[2]}` : "";
}

/** "2024-03" -> "2024-03-01" for the API. Empty or half chosen -> null. */
export function fromMonth(month: string): string | null {
  return isComplete(month) ? `${month}-01` : null;
}

export function splitMonth(month: string): { year: string; month: string } {
  const [year = "", mm = ""] = month.split("-");
  return { year, month: mm };
}

export function joinMonth(year: string, month: string): string {
  return year || month ? `${year}-${month}` : "";
}

export function isComplete(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

const isHalf = (month: string) => month !== "" && !isComplete(month);

/** The month in "YYYY-MM" for a date, read in local time (the month someone sees on their calendar). */
export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Checks a start and end month. `ongoing` means there is no end ("Present"): the end is then ignored.
 * Returns errors keyed startDate / endDate.
 */
export function checkPeriod(start: string, end: string, { ongoing = false, startRequired = false, endRequired = false } = {}): Errors {
  const e: Errors = {};
  if (isHalf(start)) e.startDate = "Choose both a month and a year.";
  else if (startRequired && start === "") e.startDate = "Choose when it started.";

  if (!ongoing) {
    if (isHalf(end)) e.endDate = "Choose both a month and a year.";
    else if (endRequired && end === "") e.endDate = "Choose when it ended, or mark it as current.";
    else if (isComplete(start) && isComplete(end) && end < start) e.endDate = "End date cannot be before the start date.";
  }
  return e;
}

// ---------------- text ----------------

function required(e: Errors, field: string, value: string, max = SHORT_MAX) {
  if (!value.trim()) e[field] = "This field is required.";
  else maxLength(e, field, value, max);
}

function maxLength(e: Errors, field: string, value: string, max = SHORT_MAX) {
  if (value.trim().length > max) e[field] = `Must be at most ${max} characters.`;
}

function url(e: Errors, field: string, value: string) {
  const v = value.trim();
  if (!v) return;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
  } catch {
    e[field] = "Must be a full http:// or https:// address.";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------- forms ----------------

export interface AboutForm {
  fullName: string; headline: string; summary: string; location: string; email: string; website: string;
  showEmailPublicly: boolean; showLocationPublicly: boolean;
  phone: string; showPhonePublicly: boolean; countryCode: string;
}

export function checkAbout(f: AboutForm): Errors {
  const e: Errors = {};
  maxLength(e, "fullName", f.fullName);
  maxLength(e, "headline", f.headline);
  maxLength(e, "summary", f.summary, LONG_MAX);
  maxLength(e, "location", f.location);
  const email = f.email.trim();
  if (email.length > EMAIL_MAX) e.email = `Must be at most ${EMAIL_MAX} characters.`;
  else if (email && !EMAIL.test(email)) e.email = "Must be a valid email address, like ana@example.com.";
  url(e, "website", f.website);
  const phone = f.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  // The server also checks the country calling code against its list.
  if (phone && (!/^\+[0-9][0-9 ()./-]*$/.test(phone) || digits < 8 || digits > 15))
    e.phone = "Must be an international number starting with + and the country code, for example +359 88 123 4567.";
  return e;
}

export interface ExperienceForm { company: string; title: string; startDate: string; endDate: string; current: boolean; description: string }

export function checkExperience(f: ExperienceForm): Errors {
  const e: Errors = {};
  required(e, "title", f.title);
  required(e, "company", f.company);
  Object.assign(e, checkPeriod(f.startDate, f.endDate, { ongoing: f.current, startRequired: true, endRequired: true }));
  maxLength(e, "description", f.description, LONG_MAX);
  return e;
}

export interface EducationForm { institution: string; degree: string; startDate: string; endDate: string }

export function checkEducation(f: EducationForm): Errors {
  const e: Errors = {};
  required(e, "institution", f.institution);
  maxLength(e, "degree", f.degree);
  Object.assign(e, checkPeriod(f.startDate, f.endDate));
  return e;
}

export interface LanguageForm { name: string; isoCode: string }

export function checkLanguage(f: LanguageForm): Errors {
  const e: Errors = {};
  required(e, "name", f.name);
  const code = f.isoCode.trim();
  if (code && !/^[a-z]{2}$/.test(code)) e.isoCode = "Two lower-case letters, for example \"bg\" or \"en\".";
  return e;
}

export interface CertificationForm { name: string; issuer: string; issueDate: string; url: string }

/** `today` is a parameter so tests can fix it. */
export function checkCertification(f: CertificationForm, today: Date = new Date()): Errors {
  const e: Errors = {};
  required(e, "name", f.name);
  maxLength(e, "issuer", f.issuer);
  if (isHalf(f.issueDate)) e.issueDate = "Choose both a month and a year.";
  else if (isComplete(f.issueDate) && f.issueDate > monthOf(today)) e.issueDate = "The issue date cannot be in the future.";
  url(e, "url", f.url);
  return e;
}

// ---------------- order ----------------

/** Newest first: what is still going on (no end) first, then by start, then by end. Undated items last. */
export function newestFirst<T>(items: T[], start: (x: T) => string | null, end: (x: T) => string | null): T[] {
  return [...items].sort((a, b) => {
    const ongoingA = !!start(a) && !end(a);
    const ongoingB = !!start(b) && !end(b);
    if (ongoingA !== ongoingB) return ongoingA ? -1 : 1;
    const byStart = (start(b) ?? "").localeCompare(start(a) ?? "");
    return byStart || (end(b) ?? "").localeCompare(end(a) ?? "");
  });
}
