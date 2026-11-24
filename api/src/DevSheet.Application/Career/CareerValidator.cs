using System.Net.Mail;
using System.Text.RegularExpressions;
using DevSheet.Domain.Entities;

namespace DevSheet.Application.Career;

/// <summary>Pure validation. Returns field name (camelCase, as the API sends it) -> messages. Empty = valid.</summary>
public static class CareerValidator
{
    public const int ShortMax = 200, LongMax = 2000, EmailMax = 254, UrlMax = 2000;

    private static readonly Regex IsoCode = new("^[a-z]{2}$", RegexOptions.Compiled);

    public static Dictionary<string, string[]> Validate(ProfileInput i)
    {
        var e = new Errors();
        e.MaxLength("fullName", i.FullName, ShortMax);
        e.MaxLength("headline", i.Headline, ShortMax);
        e.MaxLength("summary", i.Summary, LongMax);
        e.MaxLength("location", i.Location, ShortMax);
        var email = i.Email?.Trim() ?? "";
        if (email.Length > 0)
        {
            if (email.Length > EmailMax) e.Add("email", $"Must be at most {EmailMax} characters.");
            else if (!IsEmail(email)) e.Add("email", "Must be a valid email address.");
        }
        CheckUrl(e, "website", i.Website);
        var phone = i.Phone?.Trim() ?? "";
        if (phone.Length > 0 && Countries.SplitPhone(phone) is null)
            e.Add("phone", "Must be an international number starting with + and the country code, for example +359 88 123 4567.");
        var country = i.CountryCode?.Trim() ?? "";
        if (country.Length > 0 && Countries.Find(country) is null) e.Add("countryCode", "Choose a country from the list.");
        return e.Result;
    }

    public static Dictionary<string, string[]> Validate(ExperienceInput i)
    {
        var e = new Errors();
        e.Required("company", i.Company, ShortMax);
        e.Required("title", i.Title, ShortMax);
        e.MaxLength("description", i.Description, LongMax);
        if (i.StartDate is null) e.Add("startDate", "Start date is required.");
        e.DateOrder("endDate", i.StartDate, i.EndDate);
        return e.Result;
    }

    public static Dictionary<string, string[]> Validate(EducationInput i)
    {
        var e = new Errors();
        e.Required("institution", i.Institution, ShortMax);
        e.MaxLength("degree", i.Degree, ShortMax);
        e.DateOrder("endDate", i.StartDate, i.EndDate);
        return e.Result;
    }

    public static Dictionary<string, string[]> Validate(LanguageInput i)
    {
        var e = new Errors();
        e.Required("name", i.Name, ShortMax);
        var code = i.IsoCode?.Trim() ?? "";
        if (code.Length > 0 && !IsoCode.IsMatch(code))
            e.Add("isoCode", "Must be two lower-case letters (ISO 639-1), for example \"bg\".");

        var levels = new[] { i.Listening, i.Reading, i.SpokenInteraction, i.SpokenProduction, i.Writing };
        if (levels.Any(l => l is { } v && !Enum.IsDefined(v)))
            e.Add("levels", "Levels must be A1, A2, B1, B2, C1 or C2.");
        else if (i.IsMotherTongue && levels.Any(l => l is not null))
            e.Add("levels", "A native language has no levels.");
        return e.Result;
    }

    /// <param name="today">Passed in so the check is testable; an issue date in the future is rejected.</param>
    public static Dictionary<string, string[]> Validate(CertificationInput i, DateOnly today)
    {
        var e = new Errors();
        e.Required("name", i.Name, ShortMax);
        e.MaxLength("issuer", i.Issuer, ShortMax);
        if (i.IssueDate is { } d && d > today) e.Add("issueDate", "The issue date cannot be in the future.");

        CheckUrl(e, "url", i.Url);
        return e.Result;
    }

    /// <summary>An optional link: empty is fine, anything else must be a full http(s) address.</summary>
    private static void CheckUrl(Errors e, string field, string? value)
    {
        var url = value?.Trim() ?? "";
        if (url.Length == 0) return;
        if (url.Length > UrlMax) e.Add(field, $"Must be at most {UrlMax} characters.");
        else if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || (u.Scheme != Uri.UriSchemeHttp && u.Scheme != Uri.UriSchemeHttps))
            e.Add(field, "Must be a full http:// or https:// address.");
    }

    public static bool IsEmail(string value)
    {
        try { return new MailAddress(value).Address == value; }
        catch (FormatException) { return false; }
    }

    private sealed class Errors
    {
        private readonly Dictionary<string, List<string>> _map = new();
        public Dictionary<string, string[]> Result => _map.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray());

        public void Add(string field, string message)
        {
            if (!_map.TryGetValue(field, out var list)) _map[field] = list = new List<string>();
            list.Add(message);
        }

        public void Required(string field, string? value, int max)
        {
            if (string.IsNullOrWhiteSpace(value)) Add(field, "This field is required.");
            else MaxLength(field, value, max);
        }

        public void MaxLength(string field, string? value, int max)
        {
            if (value is not null && value.Trim().Length > max) Add(field, $"Must be at most {max} characters.");
        }

        public void DateOrder(string field, DateOnly? start, DateOnly? end)
        {
            if (start is { } s && end is { } en && en < s) Add(field, "End date cannot be before the start date.");
        }
    }
}
