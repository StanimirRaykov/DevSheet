using System.Net.Mail;

namespace DevSheet.Application.Career;

/// <summary>Pure validation. Returns field name (camelCase, as the API sends it) -> messages. Empty = valid.</summary>
public static class CareerValidator
{
    public const int ShortMax = 200, LongMax = 2000, EmailMax = 254;

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

    private static bool IsEmail(string value)
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
